// A tiny test runner, so the tests need nothing but Node.
let failures = 0;

export function test(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}\n     ${e.message}`);
  }
}

/** Print the result and fail the process if any test failed. */
export function finish() {
  if (failures) {
    console.log(`\n${failures} failed`);
    process.exit(1);
  }
  console.log('\nall passed');
}
