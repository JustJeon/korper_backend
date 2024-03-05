import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getApiDocs } from '../src/api/docs/get';

describe('Korper test', () => {
  test.only('GET api/docs', async () => {
    const res = await getApiDocs(createPublicLambdaEvent({}));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET user', async () => {
    const response = await privateFunctionTest(getApiDocs, {});
    expect(response).toHaveProperty('statusCode', 200);
  });
});
