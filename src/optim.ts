import { evalReverse, type InputVars } from "./eval";
import type { Input } from "./operations";

export function gradientDescent<Vars extends string>(
  op: Input<Vars>,
  vars: InputVars<Vars>,
  learningRate: number,
  iterations: number
): InputVars<Vars> {
  let input: InputVars<Vars> = vars;
  for (let i = 0; i < iterations; i++) {
    const [_loss, gradient] = evalReverse(op, input);
    for (const v of Object.keys(input)) {
      input[v] -= learningRate * gradient[v];
    }
  }
  return input;
}
