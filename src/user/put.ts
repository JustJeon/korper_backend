import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import { USER_JWT_CONTENTS } from '../lib/jwt';
import mysqlUtil from '../lib/mysqlUtil';
import { FromSchema } from 'json-schema-to-ts';
import { getHeadObject, getPresignedPostUrl, getPresignedUrl } from '../lib/aws/s3Util';

const parameter = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    profileImage: { type: 'boolean' },
    marketingAgreed: { type: 'boolean' },
  },
  required: [],
} as const;

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const { name, profileImage, marketingAgreed } = JSON.parse(event.body) as FromSchema<typeof parameter>;
  const userIdx = event.requestContext.authorizer.lambda.idx;
  const userEmail = event.requestContext.authorizer.lambda.user_email;

  // 유저 이름 업데이트
  if (name) {
    await mysqlUtil.update('tb_user', { user_name: name }, { idx: userIdx });
  }

  // 프로필 이미지 업로드 url 발급
  let profileImagePreSignedUrlInfo = {};
  if (profileImage) {
    const { url, fields } = await getPresignedPostUrl(`profile/${userEmail}/image`);
    profileImagePreSignedUrlInfo = { url, fields };
  }

  // 마케팅 동의 여부 업데이트
  if (typeof marketingAgreed === 'boolean') {
    await mysqlUtil.update('tb_user', { marketing_agreed: marketingAgreed }, { idx: userIdx });
  }

  const userColumns = [...USER_JWT_CONTENTS, 'marketing_agreed'];
  const user = await mysqlUtil.getOne('tb_user', userColumns, { idx: userIdx });
  
  // 프로필 이미지 presigned url 발급
  const s3ObjectKey = `profile/${userEmail}/image`;
  let presignedUrl = await getPresignedUrl(s3ObjectKey);
  const { error } = await getHeadObject(s3ObjectKey);
  if (error === 'NotFound') presignedUrl = null;
  user.profileImageUrl = presignedUrl;

  return {
    statusCode: 200,
    body: JSON.stringify({ code: 'Success', message: 'success', result: { user, profileImagePreSignedUrlInfo } }),
  };
};
