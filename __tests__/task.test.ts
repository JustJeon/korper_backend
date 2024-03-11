import { createPublicLambdaEvent, privateFunctionTest } from './testUtil';
import { handler as getApiDocs } from '../src/api/docs/get';
import { handler as getUser } from '../src/user/get';
import { handler as putUser } from '../src/user/put';

describe('Korper test', () => {
  test('GET api/docs', async () => {
    const res = await getApiDocs(createPublicLambdaEvent({}));
    console.log('res', res);
    expect(res).toHaveProperty('statusCode', 200);
  });

  test('GET user', async () => {
    const response = await privateFunctionTest(getUser, {});
    expect(response).toHaveProperty('statusCode', 200);
  });
});
