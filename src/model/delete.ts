import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { uid } = event.queryStringParameters as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 모델 소유 조회
  const model = await mysqlUtil.getOne('tb_model', [], { uid });
  if (!model || model.userIdx !== userIdx)
    return { statusCode: 404, body: JSON.stringify({ code: 'Model_Not_Found' }) };

  await mysqlUtil.deleteMany('tb_model', { uid });

  return { statusCode: 200, body: JSON.stringify({ code: 'Success', message: 'success', result: {} }) };
};
