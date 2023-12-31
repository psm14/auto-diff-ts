import assert from "node:assert";
import { test } from "node:test";

import * as op from "./operations";
import { gradientDescent } from "./optim";
import { evalForward, evalReverse } from "./eval";

const x1 = op.scalar("x1");
const x2 = op.scalar("x2");

const x1sq = op.constpow(x1, 2);
const x2sq = op.constpow(x2, 2);

const x1x2 = op.add(x1sq, x2sq);
const minhalf = op.constmult(-0.5, x1x2);
const expx1x2 = op.exp(minhalf);

const f = op.mult(x1, expx1x2);

function assertApprox(
  expected: number,
  actual: number,
  epsilon: number = 0.003
) {
  const diff = Math.abs(expected - actual);
  assert(diff <= epsilon, `Expected ${actual} to be approximately ${expected}`);
}

test("forward mode", () => {
  const result = evalForward(f, "x1", { x1: 2, x2: 0.5 });
  assertApprox(0.24, result.x);
  assertApprox(-0.36, result.dx);

  const result2 = evalForward(f, "x2", { x1: 2, x2: 0.5 });
  assertApprox(0.24, result2.x);
  assertApprox(-0.12, result2.dx);
});

test("reverse mode", () => {
  const [value, gradients] = evalReverse(f, { x1: 2, x2: 0.5 });
  assertApprox(0.24, value);
  assertApprox(-0.36, gradients.x1);
  assertApprox(-0.12, gradients.x2);
});

test("reverse mode - f(x) = x edge case", () => {
  const x = op.scalar("x");
  const [value, gradients] = evalReverse(x, { x: 42 });
  assertApprox(42, value);
  assertApprox(1, gradients.x);
});

test("gradient descent", () => {
  // x^2 + (y+2)^2 + (z-10)^2
  const x = op.scalar("x");
  const xsq = op.constpow(x, 2);
  const y = op.scalar("y");
  const yp2 = op.constadd(2, y);
  const ysq = op.constpow(yp2, 2);
  const z = op.scalar("z");
  const zm10 = op.constadd(-10, z);
  const zsq = op.constpow(zm10, 2);
  const xpy = op.add(xsq, ysq);
  const g = op.add(xpy, zsq);

  const result = gradientDescent(g, { x: 10, y: -5, z: 10 }, 0.001, 10000);
  assertApprox(0, result.x);
  assertApprox(-2, result.y);
  assertApprox(10, result.z);

  const [newLoss] = evalReverse(xsq, result);
  assertApprox(0, newLoss);
});

// TODO: Actually test this
test("matrices", () => {
  const w = op.matrix("w", 2, 4);
  const x = op.matrix("x", 4, 2);
  const y = op.matrix("y", 1, 4);
  const z = op.matrix("z", 4, 1);

  // 4x4
  const wx = op.matmul(w, x);
  // 4x1
  const wxy = op.matmul(wx, y);
  // 1x1
  const f = op.matmul(z, wxy);

  const [result, gradient] = evalReverse(f.params[0], {
    w: [[1,2],[3,4],[5,6],[7,8]],
    x: [[9,8,7,6],[5,4,3,2]],
    y: [[1],[2],[3],[4]],
    z: [[9,8,7,6]],
  });

  console.log(result, gradient);

  const fsq = op.mult(f.params[0], f.params[0]);

  const optim = gradientDescent(fsq, {
    w: [[1,2],[3,-4],[5,6],[7,8]],
    x: [[-9,8,7,6],[5,4,3,2]],
    y: [[1],[2],[-3],[4]],
    z: [[9,8,7,6]],
  }, 0.000001, 2);

  console.log(optim);
});
