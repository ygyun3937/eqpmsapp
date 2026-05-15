import QRCode from 'qrcode';

// partId를 포함한 URL로 QR 생성. 앱이 서버에 배포된 후 실제 URL로 변경 가능.
const getPartUrl = (partId) => {
  const base = window.location.origin;
  return `${base}?part=${partId}`;
};

// SVG 문자열로 반환 (인쇄 품질 최적)
export const generateQRSvg = async (partId) => {
  try {
    return await QRCode.toString(getPartUrl(partId), { type: 'svg', width: 200, margin: 1 });
  } catch (err) {
    console.error('QR SVG 생성 실패:', err);
    return '';
  }
};

// dataURL(PNG)로 반환 (img src에 직접 사용)
export const generateQRDataUrl = async (partId) => {
  try {
    return await QRCode.toDataURL(getPartUrl(partId), { width: 200, margin: 1 });
  } catch (err) {
    console.error('QR dataURL 생성 실패:', err);
    return '';
  }
};
