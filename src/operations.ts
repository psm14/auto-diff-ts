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

//export type Matrix = number[][];
export type MatrixVar<Name extends string> = Variable<{ [N in Name]: number[][] }>;
export type MatrixVars<Vars extends AnyVariables> = {
  width: number;
  height: number;
  params: Input<Vars>[];
};

export function matrix<Name extends string>(
  name: Name,
  width: number,
  height: number
): MatrixVars<{ [N in Name]: number[][] }> {
  function matrixVar(x: number, y: number): MatrixVar<Name> {
    const lens: VariableLens<number[][]> = {
      init() {
        const result: number[][] = [];
        for (let i = 0; i < height; i++) {
          result.push(new Array(width).fill(0));
        }
        return result;
      },
      get(variable: number[][]): number {
        return variable[y][x];
      },
      set(variable: number[][], value: number): number[][] {
        variable[y][x] = value;
        return variable;
      },
    };

    return {
      type: "var",
      name,
      lens,
    };
  }

  const params: Input<{ [N in Name]: number[][] }>[] = [];
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      params.push(matrixVar(i, j));
    }
  }
  return {
    width,
    height,
    params,
  };
}

export function matmul<X extends AnyVariables, Y extends AnyVariables>(
  a: MatrixVars<X>,
  b: MatrixVars<Y>
): MatrixVars<X & Y> {
  if (a.width !== b.height) {
    throw new Error(`Cannot multiply a ${a.width}x${a.height} matrix with a ${b.width}x${b.height} one`);
  }

  function deref<T extends AnyVariables>(m: MatrixVars<T>, x: number, y: number): Input<T> {
    return m.params[(y * m.width) + x];
  }

  const result: Input<X & Y>[] = [];
  for (let aRow = 0; aRow < a.height; aRow++) {
    for (let bCol = 0; bCol < b.width; bCol++) {
      let param: Input<X & Y> = mult(deref(a, 0, aRow), deref(b, bCol, 0));
      for (let i = 1; i < a.width; i++) {
        param = add(param, mult(deref(a, i, aRow), deref(b, bCol, i)));
      }
      result.push(param);
    }
  }

  return {
    width: b.width,
    height: a.height,
    params: result,
  }
}
