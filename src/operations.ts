export type Variable<Name extends string> = {
  type: "var";
  name: Name;
};

export function variable<Name extends string>(name: Name): Variable<Name> {
  return {
    type: "var",
    name,
  };
}

export type Op<Vars extends string> = {
  type: "op";
  name: string;
  inputs: Input<Vars>[];
  value(inputs: number[]): number;
  deriv(inputs: number[]): number[];
}

export type Input<Vars extends string> = { type: "var"; name: Vars } | Op<Vars>;

export function add<X extends string, Y extends string>(
  a: Input<X>,
  b: Input<Y>
): Op<X | Y> {
  return {
    type: "op",
    name: `(${a.name} + ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x + y,
    deriv: () => [1, 1],
  };
}

export function constadd<X extends string>(k: number, a: Input<X>): Op<X> {
  return {
    type: "op",
    name: `(${a.name} + ${k})`,
    inputs: [a],
    value: ([x]) => k + x,
    deriv: () => [1],
  };
}

export function mult<X extends string, Y extends string>(
  a: Input<X>,
  b: Input<Y>
): Op<X | Y> {
  return {
    type: "op",
    name: `(${a.name} * ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x * y,
    deriv: ([x, y]) => [y, x],
  };
}

export function constmult<X extends string>(k: number, a: Input<X>): Op<X> {
  return {
    type: "op",
    name: `${k}${a.name}`,
    inputs: [a],
    value: ([x]) => k * x,
    deriv: () => [k],
  };
}

export function div<X extends string, Y extends string>(
  a: Input<X>,
  b: Input<Y>
): Op<X | Y> {
  return {
    type: "op",
    name: `(${a.name} / ${b.name})`,
    inputs: [a, b],
    value: ([x, y]) => x / y,
    deriv: ([x, y]) => [1 / y, x * Math.log(y)],
  };
}

export function constdiv<X extends string>(k: number, a: Input<X>): Op<X> {
  return {
    type: "op",
    name: ` ${k} / ${a.name}`,
    inputs: [a],
    value: ([x]) => k / x,
    deriv: ([x]) => [k * Math.log(x)],
  };
}

export function constpow<X extends string>(a: Input<X>, k: number): Op<X> {
  return {
    type: "op",
    name: `${a.name}^${k}`,
    inputs: [a],
    value: ([x]) => Math.pow(x, k),
    deriv: ([x]) => [k * Math.pow(x, k - 1)],
  };
}

export function exp<X extends string>(a: Input<X>): Op<X> {
  return {
    type: "op",
    name: `e^${a.name}`,
    inputs: [a],
    value: ([x]) => Math.exp(x),
    deriv: ([x]) => [Math.exp(x)],
  };
}
