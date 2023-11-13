export type VariableLens<T> = {
  init(): T;
  get(variable: T): number;
  set(variable: T, value: number): T;
};

const scalarLens: VariableLens<number> = {
  get(variable: number): number {
    return variable;
  },
  init() {
    return 0;
  },
  set(_variable: number, value: number) {
    return value;
  },
};

export type Variable<Param extends {}> = {
  type: "var";
  name: keyof Param & string;
  lens: VariableLens<Param[keyof Param & string]>;
};

export type AnyVariables = Record<string, any>;

export function scalar<Name extends string>(
  name: Name
): Variable<{ [N in Name]: number }> {
  return {
    type: "var",
    name,
    lens: scalarLens,
  };
}

export type Op<Vars extends AnyVariables> = {
  type: "op";
  name: string;
  inputs: Input<Vars>[];
  value(inputs: number[]): number;
  deriv(inputs: number[]): number[];
};

export type Input<Vars extends AnyVariables> = Variable<Vars> | Op<Vars>;

export function add<X extends AnyVariables, Y extends AnyVariables>(
  a: Input<X>,
  b: Input<Y>
): Op<X & Y> {
  return {
    type: "op",
    name: `(${a.name} + ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x + y,
    deriv: () => [1, 1],
  };
}

export function constadd<X extends AnyVariables>(
  k: number,
  a: Input<X>
): Op<X> {
  return {
    type: "op",
    name: `(${a.name} + ${k})`,
    inputs: [a],
    value: ([x]) => k + x,
    deriv: () => [1],
  };
}

export function mult<X extends AnyVariables, Y extends AnyVariables>(
  a: Input<X>,
  b: Input<Y>
): Op<X & Y> {
  return {
    type: "op",
    name: `(${a.name} * ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x * y,
    deriv: ([x, y]) => [y, x],
  };
}

export function constmult<X extends AnyVariables>(
  k: number,
  a: Input<X>
): Op<X> {
  return {
    type: "op",
    name: `${k}${a.name}`,
    inputs: [a],
    value: ([x]) => k * x,
    deriv: () => [k],
  };
}

export function div<X extends AnyVariables, Y extends AnyVariables>(
  a: Input<X>,
  b: Input<Y>
): Op<X & Y> {
  return {
    type: "op",
    name: `(${a.name} / ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x / y,
    deriv: ([x, y]) => [1 / y, x * Math.log(y)],
  };
}

export function constdiv<X extends AnyVariables>(
  k: number,
  a: Input<X>
): Op<X> {
  return {
    type: "op",
    name: ` ${k} / ${a.name}`,
    inputs: [a],
    value: ([x]) => k / x,
    deriv: ([x]) => [k * Math.log(x)],
  };
}

export function constpow<X extends AnyVariables>(
  a: Input<X>,
  k: number
): Op<X> {
  return {
    type: "op",
    name: `${a.name}^${k}`,
    inputs: [a],
    value: ([x]) => Math.pow(x, k),
    deriv: ([x]) => [k * Math.pow(x, k - 1)],
  };
}

export function exp<X extends AnyVariables>(a: Input<X>): Op<X> {
  return {
    type: "op",
    name: `e^${a.name}`,
    inputs: [a],
    value: ([x]) => Math.exp(x),
    deriv: ([x]) => [Math.exp(x)],
  };
}

export type Matrix = [number, number, number, number];
export type MatrixVar<Name extends string> = Variable<{ [N in Name]: Matrix }>;
export type MatrixVars<Vars extends AnyVariables> = [
  Input<Vars>,
  Input<Vars>,
  Input<Vars>,
  Input<Vars>
];

export function matrix<Name extends string>(
  name: Name
): MatrixVars<{ [N in Name]: Matrix }> {
  function matrixVar(idx: number): MatrixVar<Name> {
    const lens: VariableLens<Matrix> = {
      init() {
        return [0, 0, 0, 0];
      },
      get(variable: Matrix): number {
        return variable[idx];
      },
      set(variable: Matrix, value: number): Matrix {
        variable[idx] = value;
        return variable;
      },
    };

    return {
      type: "var",
      name,
      lens,
    };
  }

  return [matrixVar(0), matrixVar(1), matrixVar(2), matrixVar(3)];
}

export function matmul<X extends AnyVariables, Y extends AnyVariables>(
  [a, b, c, d]: MatrixVars<X>,
  [w, x, y, z]: MatrixVars<Y>
): MatrixVars<X & Y> {
  const p = add(mult(a, w), mult(b, y));
  const q = add(mult(a, x), mult(b, z));
  const r = add(mult(c, w), mult(d, y));
  const s = add(mult(c, x), mult(d, z));

  return [p, q, r, s];
}

export function determinant<X extends AnyVariables>([
  a,
  b,
  c,
  d,
]: MatrixVars<X>): Op<X> {
  const ad = mult(a, d);
  const bc = mult(b, c);
  const negbc = constmult(-1, bc);
  return add(ad, negbc);
}
