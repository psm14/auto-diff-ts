export type VariableLens<T> = {
  init(): T;
  get(variable: T): number;
  set(variable: T, value: number): T;
}

const scalarLens: VariableLens<number> = {
  get(variable: number): number {
    return variable;
  },
  init() {
    return 0;
  },
  set(_variable: number, value: number) {
    return value;
  }
}

export type Variable<Param extends {}> = {
  type: "var";
  name: keyof Param & string;
  lens: VariableLens<Param[keyof Param & string]>;
};

export type AnyVariables = Record<string, any>;

export function scalar<Name extends string>(name: Name): Variable<{ [N in Name]: number }> {
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
}

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

export function constadd<X extends AnyVariables>(k: number, a: Input<X>): Op<X> {
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

export function constmult<X extends AnyVariables>(k: number, a: Input<X>): Op<X> {
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

export function constdiv<X extends AnyVariables>(k: number, a: Input<X>): Op<X> {
  return {
    type: "op",
    name: ` ${k} / ${a.name}`,
    inputs: [a],
    value: ([x]) => k / x,
    deriv: ([x]) => [k * Math.log(x)],
  };
}

export function constpow<X extends AnyVariables>(a: Input<X>, k: number): Op<X> {
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
