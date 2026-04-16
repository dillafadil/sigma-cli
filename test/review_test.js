function calculate(a, b) {
  return a + b; // potential bug: no type check
}

let x = 5;
var y = 10; // code smell: var instead of let/const

function duplicateLogic() {
  return Math.sqrt(16);
}

function duplicateLogic2() {
  return Math.sqrt(16); // duplicated logic
}
