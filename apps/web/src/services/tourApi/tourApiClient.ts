import type { TourSpot } from '@/shared/types';

const TOUR_API_KEY = import.meta.env.VITE_TOUR_API_KEY;

// 시도명 → TourAPI areaCode 매핑
const AREA_CODE_MAP: Record<string, number> = {
  서울: 1,
  서울특별시: 1,
  인천: 2,
  인천광역시: 2,
  대전: 3,
  대전광역시: 3,
  대구: 4,
  대구광역시: 4,
  광주: 5,
  광주광역시: 5,
  부산: 6,
  부산광역시: 6,
  울산: 7,
  울산광역시: 7,
  세종: 8,
  세종특별자치시: 8,
  경기: 31,
  경기도: 31,
  강원: 32,
  강원도: 32,
  강원특별자치도: 32,
  충북: 33,
  충청북도: 33,
  충남: 34,
  충청남도: 34,
  경북: 35,
  경상북도: 35,
  경남: 36,
  경상남도: 36,
  전북: 37,
  전라북도: 37,
  전북특별자치도: 37,
  전남: 38,
  전라남도: 38,
  제주: 39,
  제주특별자치도: 39,
};

export function getAreaCode(provinceName: string): number | null {
  // 공백 제거 및 정규화
  const normalized = provinceName.replace(/\s+/g, '');
  return AREA_CODE_MAP[normalized] ?? null;
}

export function isTourApiConfigured(): boolean {
  return Boolean(TOUR_API_KEY);
}

interface TourApiResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: TourApiItem[] | TourApiItem;
      } | '';
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

interface TourApiItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  mapx: string;
  mapy: string;
  firstimage?: string;
  firstimage2?: string;
  tel?: string;
}

function mapToTourSpot(item: TourApiItem): TourSpot {
  return {
    contentId: item.contentid,
    contentTypeId: item.contenttypeid,
    title: item.title,
    addr1: item.addr1,
    addr2: item.addr2,
    mapx: parseFloat(item.mapx),
    mapy: parseFloat(item.mapy),
    firstimage: item.firstimage,
    firstimage2: item.firstimage2,
    tel: item.tel,
  };
}

type TourApiGwError = {
  responseTime?: string;
  resultCode: string;
  resultMsg: string;
};

function isGwError(x: any): x is TourApiGwError {
  return (
    x &&
    typeof x.resultCode === 'string' &&
    typeof x.resultMsg === 'string' &&
    !x.response
  );
}

export interface FetchTourSpotsOptions {
  areaCode: number;
  contentTypeId?: number; // 12: 관광지, 14: 문화시설, 15: 축제/행사, 28: 레포츠, 39: 음식점
  numOfRows?: number;
  pageNo?: number;
}

/**
 * TourAPI에서 관광지 목록 조회
 * 개발 환경에서는 Vite proxy를 통해 CORS 우회
 */
export async function fetchTourSpots(
  options: FetchTourSpotsOptions
): Promise<{ spots: TourSpot[]; totalCount: number }> {
  if (!isTourApiConfigured()) {
    throw new Error('TourAPI 서비스 키가 설정되지 않았습니다.');
  }

  const { areaCode, contentTypeId, numOfRows = 20, pageNo = 1 } = options;

  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'GOKO',
    _type: 'json',
    areaCode: String(areaCode),
    numOfRows: String(numOfRows),
    pageNo: String(pageNo),
    arrange: 'A', // 제목순 정렬
  });

  if (typeof contentTypeId === 'number') {
    params.set('contentTypeId', String(contentTypeId));
  }

  // 개발 환경: Vite proxy 사용 (/api/tour)
  // 프로덕션: 실제 API URL 또는 백엔드 프록시 사용
  const baseUrl = import.meta.env.DEV
    ? '/api/tour'
    : 'https://apis.data.go.kr/B551011/EngService2';

  const safeKey = String(TOUR_API_KEY).includes('%')
    ? String(TOUR_API_KEY)
    : encodeURIComponent(String(TOUR_API_KEY));

  const url = `${baseUrl}/areaBasedList2?serviceKey=${safeKey}&${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch {
      /* ignore */
    }
    console.error('TourAPI 에러 상세:', response.status, errorDetail);
    throw new Error(`TourAPI 요청 실패: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();

  // ✅ GW 에러 포맷 처리
  if (isGwError(data)) {
    throw new Error(`TourAPI 오류(${data.resultCode}): ${data.resultMsg}`);
  }

  // ✅ 정상 TourAPI 포맷 처리
  if (!data?.response?.header) {
    console.error('[TourAPI] Unexpected payload:', data);
    throw new Error('TourAPI 응답 형식이 예상과 다릅니다.');
  }

  if (data.response.header.resultCode !== '0000') {
    throw new Error(`TourAPI 오류: ${data.response.header.resultMsg}`);
  }

  const body = data.response.body;

  // 결과가 없는 경우 (TourAPI는 결과 없을 때 items를 빈 문자열로 반환)
  if (!body.items || typeof body.items === 'string') {
    return { spots: [], totalCount: 0 };
  }

  // 단일 아이템인 경우 배열로 변환
  const items = Array.isArray(body.items.item) ? body.items.item : [body.items.item];

  const spots = items.map(mapToTourSpot);
  console.log('[spot sample]', items[0]?.title, items[0]?.mapx, items[0]?.mapy);
  console.log('[TourAPI Request]', url);
  return {
    spots,
    totalCount: body.totalCount,
  };
}
