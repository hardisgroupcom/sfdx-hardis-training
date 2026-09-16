/**
 * Recomputes the planned capacity of installations that are not done yet, from
 * the crew capacity reference table. Schedulable so the pipeline can book it
 * after a deployment, which is the point of the lab that ships it.
 */
global with sharing class CrewCapacityBatch implements Database.Batchable<SObject>, Schedulable {
    global Database.QueryLocator start(Database.BatchableContext context) {
        return Database.getQueryLocator(
            'SELECT Id, Roof_Type__c, Panels_Required__c, Total_Capacity_kW__c ' +
            'FROM Installation__c WHERE Status__c != \'Done\''
        );
    }

    global void execute(Database.BatchableContext context, List<Installation__c> scope) {
        Map<String, Decimal> panelsPerDayByRoofType = new Map<String, Decimal>();
        for (Crew_Capacity__c capacity : [
            SELECT Roof_Type__c, Panels_Per_Day__c
            FROM Crew_Capacity__c
            WHERE Crew_Type__c = 'Roof'
        ]) {
            panelsPerDayByRoofType.put(capacity.Roof_Type__c, capacity.Panels_Per_Day__c);
        }
        List<Installation__c> toUpdate = new List<Installation__c>();
        for (Installation__c installation : scope) {
            Decimal perDay = panelsPerDayByRoofType.get(installation.Roof_Type__c);
            if (perDay == null || perDay == 0 || installation.Panels_Required__c == null) {
                continue;
            }
            // 400 W a panel, in kW, over the days the crew needs
            installation.Total_Capacity_kW__c = (installation.Panels_Required__c * 0.4)
                .setScale(2, System.RoundingMode.HALF_UP);
            toUpdate.add(installation);
        }
        if (!toUpdate.isEmpty()) {
            update toUpdate;
        }
    }

    global void finish(Database.BatchableContext context) {
        // Nothing to report: the next run recomputes everything anyway.
        // Touched by US-027 to prove a deployment action runs on a merge.
    }

    global void execute(SchedulableContext context) {
        Database.executeBatch(this, 200);
    }
}
