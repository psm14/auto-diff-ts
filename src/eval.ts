import type { AnyVariables, Input } from "./operations";

export type Value = {
  x: number;
  dx: number;
};

export function evalForward<In extends AnyVariables>(
  op: Input<In>,
  wrt: keyof In,
  vars: In
): Value {
  const memo: Map<Input<In>, Value> = new Map();
  function visit(op: Input<In>): Value {
    if (memo.has(op)) {
      return memo.get(op)!;
    } else if (op.type === "var") {
      const variable = vars[op.name];
      const x = op.lens.get(variable);
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

export type UpdateFn = (loss: number, input: number, gradient: number) => number;

export function evalReverse<Vars extends AnyVariables>(
  op: Input<Vars>,
  vars: Vars,
  update?: UpdateFn,
): [number, Vars] {
  const valueMemo: Map<Input<Vars>, number> = new Map();
  const evalVisits: Map<Input<Vars>, number> = new Map();
  function evaluate(op: Input<Vars>): number {
    const visits = (evalVisits.get(op) ?? 0) + 1;
    evalVisits.set(op, visits);

    if (valueMemo.has(op)) {
      return valueMemo.get(op)!;
    } else if (op.type === "var") {
      const resultVar = vars[op.name];
      const result = op.lens.get(resultVar);
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
  const gradients: Partial<Vars> = {};

  const backpropMemo: Map<Input<Vars>, number> = new Map();
  const backpropVisits: Map<Input<Vars>, number> = new Map();
  backpropMemo.set(op, 1);

  function backprop(op: Input<Vars>) {
    const visits = (backpropVisits.get(op) ?? 0) + 1;
    backpropVisits.set(op, visits);

    if (visits < evalVisits.get(op)!) {
      return;
    } else if (op.type === 'var') {
      const gradient = backpropMemo.get(op)!;
      const current = gradients[op.name] ?? op.lens.init();
      gradients[op.name] = op.lens.set(current, gradient);

      if (update !== undefined) {
        const input = valueMemo.get(op)!;
        const newValue = update(evalResult, input, gradient);
        vars[op.name] = op.lens.set(vars[op.name], newValue);
      }
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

  return [evalResult, gradients as Vars];
}
