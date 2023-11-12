import type { Input } from "./operations";

export type InputVars<Vars extends string> = {
  [V in Vars]: number;
};

export type Value = {
  x: number;
  dx: number;
};

export function evalForward<Vars extends string>(
  op: Input<Vars>,
  wrt: Vars,
  vars: InputVars<Vars>
): Value {
  const memo: Map<Input<Vars>, Value> = new Map();
  function visit(op: Input<Vars>): Value {
    if (memo.has(op)) {
      return memo.get(op)!;
    } else if (op.type === "var") {
      const x = vars[op.name];
      const dx = op.name === wrt ? 1 : 0;
      const result = { x, dx };
      memo.set(op, result);
      return result;
    } else {
      const inputs = op.inputs.map((i) => visit(i));
      const inputVals = inputs.map((i) => i.x);
      const x = op.value(inputVals);
      const dx = op
        .deriv(inputVals)
        .reduce((acc, n, idx) => acc + inputs[idx].dx * n, 0);
      const result = { x, dx };
      memo.set(op, result);
      return result;
    }
  }
  return visit(op);
}

export type Gradient<Vars extends string> = { [K in Vars]: number };

export function evalReverse<Vars extends string>(
  op: Input<Vars>,
  vars: InputVars<Vars>
): [number, Gradient<Vars>] {
  const valueMemo: Map<Input<Vars>, number> = new Map();
  const evalVisits: Map<Input<Vars>, number> = new Map();
  function evaluate(op: Input<Vars>): number {
    const visits = (evalVisits.get(op) ?? 0) + 1;
    evalVisits.set(op, visits);

    if (valueMemo.has(op)) {
      return valueMemo.get(op)!;
    } else if (op.type === "var") {
      const result = vars[op.name];
      valueMemo.set(op, result);
      return result;
    } else {
      const inputs = op.inputs.map((i) => {
        return evaluate(i);
      });
      const result = op.value(inputs);
      valueMemo.set(op, result);
      return result;
    }
  }
  evaluate(op);

  const evalResult = valueMemo.get(op)!;
  const gradients: Partial<Gradient<Vars>> = {};

  const backpropMemo: Map<Input<Vars>, number> = new Map();
  const backpropVisits: Map<Input<Vars>, number> = new Map();
  backpropMemo.set(op, 1);

  function backprop(op: Input<Vars>) {
    const visits = (backpropVisits.get(op) ?? 0) + 1;
    backpropVisits.set(op, visits);

    if (visits < evalVisits.get(op)!) {
      return;
    } else if (op.type === 'var') {
      gradients[op.name] = backpropMemo.get(op);
      return;
    }

    const inputs = op.inputs.map((input) => valueMemo.get(input)!);
    const derivs = op.deriv(inputs);
    const ubar = backpropMemo.get(op)!;
    op.inputs.forEach((input, idx) => {
      const current = backpropMemo.get(input) ?? 0;
      const dx = ubar * derivs[idx];
      backpropMemo.set(input, current + dx);
      backprop(input);
    });
  }
  backprop(op);

  return [evalResult, gradients as Gradient<Vars>];
}
