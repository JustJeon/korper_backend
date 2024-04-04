import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { getPresignedPostUrl } from '../lib/aws/s3Util';
import { nanoid } from 'nanoid';

const parameter = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    metadata: { type: 'string' }, // json string
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { name, metadata } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 모델 데이터 생성
  const modelUid = nanoid(10);
  await mysqlUtil.create('tb_model', {
    uid: modelUid,
    userIdx,
    name,
    metadata: metadata ? JSON.parse(metadata) : null,
  });
  const model = await mysqlUtil.getOne('tb_model', [], { uid: modelUid });

  // 모델, 썸네일 업로드 url 발급
  model.thumbnailUrl = await getPresignedPostUrl(`model/${model.uid}/thumbnail.png`);
  model.modelUrl = await getPresignedPostUrl(`model/${model.uid}/model.usdz`);

  return {
    statusCode: 200,
    body: JSON.stringify({ code: 'Success', message: 'success', result: { model } }),
  };
};
