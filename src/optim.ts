import { evalReverse } from "./eval";
import type { AnyVariables, Input } from "./operations";

export function gradientDescent<Vars extends AnyVariables>(
  op: Input<Vars>,
  vars: Vars,
  learningRate: number,
  iterations: number
): Vars {
  let input: Vars = { ...vars };
  for (let i = 0; i < iterations; i++) {
    evalReverse(op, input, (_loss, input, gradient) => input - learningRate * gradient);
  }
  return input;
}
