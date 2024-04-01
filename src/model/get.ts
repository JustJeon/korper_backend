import { APIGatewayProxyEventV2 } from 'aws-lambda';
import mysqlUtil from '../lib/mysqlUtil';
import { getHeadObject, getPresignedUrl } from '../lib/aws/s3Util';
import { FromSchema } from 'json-schema-to-ts';

const parameter = {
  type: 'object',
  properties: {
    uid: { type: 'string' },
  },
  required: ['uid'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const { uid } = event.queryStringParameters as FromSchema<typeof parameter>;

  // 모델 정보 조회
  const model = await mysqlUtil.getOne('tb_model', [], { uid });
  if (!model) return { statusCode: 404, body: JSON.stringify({ code: 'Model_Not_Found' }) };

  // 모델, 썸네일 presigned url 발급
  const s3ThumbnailKey = `model/${uid}/thumbnail.png`;
  let thumbnailUrl = await getPresignedUrl(s3ThumbnailKey);
  const { error: thumbnailError } = await getHeadObject(s3ThumbnailKey);
  if (thumbnailError === 'NotFound') thumbnailUrl = null;
  model.thumbnailUrl = thumbnailUrl;

  const s3ModelKey = `model/${uid}/model.usdz`;
  let modelUrl = await getPresignedUrl(s3ModelKey);
  const { error: modelError } = await getHeadObject(s3ModelKey);
  if (modelError === 'NotFound') modelUrl = null;
  model.modelUrl = modelUrl;

  return {
    statusCode: 200,
    body: JSON.stringify({
      code: 'Success',
      message: 'success',
      result: { model },
    }),
  };
};
