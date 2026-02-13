let studentNames:string[] = ['Naveen', 'kumar', 'Ramesh'];
let marks:number[] = [90, 80, 70];
let updatedMarks:number[] = [];
for (let i=0; i<marks.length; i++){
    marks[i] = marks[i]+10;
    updatedMarks.push(marks[i]);
}
 let total:number = 0;
 for (let mark of updatedMarks){
     total = total + mark;
 }
 let average:number = total/updatedMarks.length;
 console.log("updatedmarks: ", updatedMarks);
 for (let i=0; i<studentNames.length; i++){
     console.log(studentNames[i], " : ", updatedMarks[i]);
 }
 console.log("Average marks: ", average.toFixed(1));