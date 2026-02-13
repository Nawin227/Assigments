function checkLoanEligibility(custmerName:string,creditscore:number,income:number,isemployed:boolean,debtToIncomeRatio:number):void  
{
    if (creditscore >=750){
        console.log(`${custmerName}-loan approved`);
        return;
    }
    if (creditscore <650){
        console.log(`${custmerName}-loan denied`);
        return;
    }
    if (creditscore >=650 && creditscore <=750){

        if (income <50000){
            console.log(`${custmerName}-loan denied`);
            return;
        }
            if(!isemployed){
                console.log(`${custmerName}-loan denied`);
                return;
            }
           if (debtToIncomeRatio < 40){
                console.log(`${custmerName}-loan approved`);
           }
            else{
                console.log(`${custmerName}-loan denied`);
                return;
                }
            }
            }
            const customerName="Naveen";
            const creditScore=700;
            const income=60000;
            const isEmployed=true;
            const debtToIncomeRatio=3.5;
            checkLoanEligibility(customerName,creditScore,income,isEmployed,debtToIncomeRatio);

        
    