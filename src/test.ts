import assert from 'node:assert';
import { test } from 'node:test';

import * as op from './operations';
import { evalForward, evalReverse } from './eval';

const x1 = op.variable("x1");
const x2 = op.variable("x2");

const x1sq = op.constpow(x1, 2);
const x2sq = op.constpow(x2, 2);

const x1x2 = op.add(x1sq, x2sq);
const minhalf = op.constmult(-0.5, x1x2);
const expx1x2 = op.exp(minhalf);

const f = op.mult(x1, expx1x2);

function assertApprox(expected: number, actual: number, epsilon: number = 0.003) {
  const diff = Math.abs(expected - actual);
  assert(diff <= epsilon, `Expected ${actual} to be approximately ${expected}`);
}

test('forward mode', () => {
  const result = evalForward(f, "x1", { x1: 2, x2: 0.5 });
  assertApprox(0.24, result.x);
  assertApprox(-0.36, result.dx);

  const result2 = evalForward(f, "x2", { x1: 2, x2: 0.5 });
  assertApprox(0.24, result2.x);
  assertApprox(-0.12, result2.dx);
})

test('reverse mode', () => {
  const [value, gradients] = evalReverse(f, { x1: 2, x2: 0.5 });
  assertApprox(0.24, value);
  assertApprox(-0.36, gradients.x1);
  assertApprox(-0.12, gradients.x2);
})

test('reverse mode - f(x) = x edge case', () => {
  const x = op.variable("x");
  const [value, gradients] = evalReverse(x, { x: 42 });
  assertApprox(42, value);
  assertApprox(1, gradients.x);
})