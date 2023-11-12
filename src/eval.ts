import type { Input } from "./operations";

export type InputVars<Vars extends string> = {
  [V in Vars]: number;
};

export function evalDfs<Vars extends string>(
  op: Input<Vars>,
  vars: InputVars<Vars>,
  memo: Map<Input<Vars>, number> = new Map()
): [number, Map<Input<Vars>, number>] {
  if (memo.has(op)) {
    return [memo.get(op)!, memo];
  } else if (op.type === "var") {
    console.log(`${op.name}: ${vars[op.name]}`);
    const result = vars[op.name];
    memo.set(op, result);
    return [result, memo];
  } else {
    const inputs = op.inputs.map((i) => evalDfs(i, vars, memo)[0]);
    const result = op.value(inputs);
    console.log(`${op.name}: ${result}`);
    memo.set(op, result);
    return [result, memo];
  }
}

export type Value = {
  x: number;
  dx: number;
};

export function evalForward<Vars extends string>(
  op: Input<Vars>,
  wrt: Vars,
  vars: InputVars<Vars>,
  memo: Map<Input<Vars>, Value> = new Map()
): [Value, Map<Input<Vars>, Value>] {
  if (memo.has(op)) {
    return [memo.get(op)!, memo];
  } else if (op.type === "var") {
    const x = vars[op.name];
    const dx = op.name === wrt ? 1 : 0;
    const result = { x, dx };
    console.log(`${op.name}: ${JSON.stringify(result)}`);
    memo.set(op, result);
    return [result, memo];
  } else {
    const inputs = op.inputs.map((i) => evalForward(i, wrt, vars, memo)[0]);
    const inputVals = inputs.map((i) => i.x);
    const x = op.value(inputVals);
    const dx = op
      .deriv(inputVals)
      .reduce((acc, n, idx) => acc + inputs[idx].dx * n, 0);
    const result = { x, dx };
    console.log(`${op.name}: ${JSON.stringify(result)}`);
    memo.set(op, result);
    return [result, memo];
  }
}

export type Gradient<Vars extends string> = { [K in Vars]: number };

export function evalReverse<Vars extends string>(
  op: Input<Vars>,
  vars: InputVars<Vars>
): [number, Gradient<Vars>] {
  const valueMemo: Map<Input<Vars>, number> = new Map();
  const deepestVisit: Map<Input<Vars>, number> = new Map();
  let maxDepth = 0;
  function firstTraversal(op: Input<Vars>, depth: number = 0): number {
    if (maxDepth < depth) {
      maxDepth = depth;
    }
    if (!deepestVisit.has(op)) {
      deepestVisit.set(op, depth);
    } else if (deepestVisit.get(op)! < depth) {
      deepestVisit.set(op, depth);
    }
    if (valueMemo.has(op)) {
      return valueMemo.get(op)!;
    } else if (op.type === "var") {
      const result = vars[op.name];
      valueMemo.set(op, result);
      return result;
    } else {
      const inputs = op.inputs.map((i) => firstTraversal(i, depth + 1));
      const result = op.value(inputs);
      valueMemo.set(op, result);
      return result;
    }
  }
  firstTraversal(op);

  const result: Partial<Gradient<Vars>> = {};

  const backMemo: Map<Input<Vars>, number> = new Map();
  backMemo.set(op, 1);
  let bfs: Input<Vars>[] = [op];
  for (let depth = 0; depth <= maxDepth; depth++) {
    let nextBfs: Input<Vars>[] = [];
    for (let i = 0; i < bfs.length; i++) {
      const o = bfs[i];
      if (o.type === "var") {
        result[o.name] = backMemo.get(o)!;
        continue;
      }
      const inputs = o.inputs.map((i) => valueMemo.get(i)!);
      const derivs = o.deriv(inputs);
      const u = backMemo.get(o)!;
      for (let j = 0; j < o.inputs.length; j++) {
        const input = o.inputs[j];
        const cur = backMemo.get(input) ?? 0;
        const dx = u * derivs[j];
        console.log(input.name, dx);
        backMemo.set(input, cur + dx);

        if (deepestVisit.get(input)! === depth + 1) {
          nextBfs.push(input);
        }
      }
    }
    bfs = nextBfs;
  }

  return [valueMemo.get(op)!, result as Gradient<Vars>];
}
