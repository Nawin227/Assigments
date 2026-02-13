let person ={
    name: "Alice",
    age: 30,
    city: "New York"
};
person.age=35;
console.log(person.name + " is " + person.age + " years old and lives in " + person.city + ".");
//immutable//
let name="Naveen";
name[0]="R";
console.log(name); // Output: "Naveen"