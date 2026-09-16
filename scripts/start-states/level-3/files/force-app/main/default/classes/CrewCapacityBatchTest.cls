@isTest
private class CrewCapacityBatchTest {
    @testSetup
    static void setup() {
        insert new Crew_Capacity__c(
            Name = 'Roof tile',
            External_Id__c = 'CAP-ROOF-TILE',
            Crew_Type__c = 'Roof',
            Roof_Type__c = 'Tile',
            Panels_Per_Day__c = 18
        );
        Account account = new Account(Name = 'Capacity test account');
        insert account;
        insert new Installation__c(
            Account__c = account.Id,
            External_Id__c = 'INST-CAP-TEST',
            Install_Date__c = Date.today().addDays(10),
            Roof_Type__c = 'Tile',
            Status__c = 'Planned',
            Crew_Size__c = 2,
            Panels_Required__c = 20
        );
    }

    @isTest
    static void itComputesCapacityFromThePanelCount() {
        Test.startTest();
        Database.executeBatch(new CrewCapacityBatch(), 200);
        Test.stopTest();

        Installation__c installation = [
            SELECT Total_Capacity_kW__c FROM Installation__c WHERE External_Id__c = 'INST-CAP-TEST'
        ];
        System.assertEquals(8.00, installation.Total_Capacity_kW__c, 'Twenty panels at 400 W is 8 kW');
    }

    @isTest
    static void itSchedulesItself() {
        Test.startTest();
        String jobId = System.schedule('Crew capacity test', '0 0 2 * * ?', new CrewCapacityBatch());
        Test.stopTest();
        System.assertNotEquals(null, jobId, 'The batch must be schedulable');
    }
}
