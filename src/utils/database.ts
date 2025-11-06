import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_CONFIG } from '../config/api'

// 백엔드 API 기본 URL - API_CONFIG 사용
const API_BASE_URL = API_CONFIG.BASE_URL

// API 호출 헬퍼 함수]
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`

  console.log('🌐 API 호출 시작')
  console.log('📍 Endpoint:', endpoint)
  console.log('🔗 Full URL:', url)
  console.log('⚙️ Options:', JSON.stringify(options, null, 2))

  try {
    // 저장된 토큰 가져오기
    const token = (global as any).token
    console.log('🔑 토큰:', token ? `${token.substring(0, 20)}...` : '없음')

    // FormData인 경우 Content-Type 헤더를 자동으로 설정하도록 함
    const headers =
      options.body instanceof FormData
        ? {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          } // FormData는 Content-Type을 자동 설정
        : {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
          }

    console.log('📋 Headers:', JSON.stringify(headers, null, 2))

    console.log('🚀 Fetch 호출 시작...')
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        // 필요한 경우 Authorization 헤더 추가
        Authorization: `Bearer ${token}`,
      },
      ...options,
      // HTTP 요청 허용을 위한 설정
      mode: 'cors',
      credentials: 'include',
    })

    console.log('✅ Fetch 완료')
    console.log('📊 Response Status:', response.status)
    console.log('📊 Response StatusText:', response.statusText)
    console.log('📊 Response OK:', response.ok)

    // 401 에러 시 토큰 갱신 시도
    if (response.status === 401) {
      try {
        const newToken = await refreshToken()
        if (newToken) {
          // 새로운 토큰으로 재시도
          const retryHeaders =
            options.body instanceof FormData
              ? {
                  ...(newToken && { Authorization: `Bearer ${newToken}` }),
                  ...options.headers,
                }
              : {
                  'Content-Type': 'application/json',
                  ...(newToken && { Authorization: `Bearer ${newToken}` }),
                  ...options.headers,
                }

          const retryResponse = await fetch(url, {
            ...options,
            headers: retryHeaders,
            mode: 'cors',
          })

          if (retryResponse.ok) {
            const contentType = retryResponse.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              return retryResponse.json()
            } else {
              return retryResponse.text()
            }
          }
        }
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그아웃 처리
        await AsyncStorage.removeItem('authToken')
        await AsyncStorage.removeItem('authUser')
        ;(global as any).token = null
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
      }
    }

    if (!response.ok) {
      console.log('❌ Response not OK')
      const errorText = await response.text()
      console.log('❌ Error Text:', errorText)
      let errorMessage = 'API 호출 실패'

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorMessage
        console.log('❌ Parsed Error JSON:', errorJson)
      } catch {
        errorMessage = `HTTP ${response.status}: ${errorText}`
        console.log('❌ Could not parse error as JSON')
      }

      console.error('❌ Final Error Message:', errorMessage)
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    console.log('📦 Content-Type:', contentType)
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json()
      console.log('✅ JSON Response:', JSON.stringify(jsonData, null, 2))
      return jsonData
    } else {
      const textData = await response.text()
      console.log('✅ Text Response:', textData)
      return textData
    }
  } catch (error) {
    console.error('❌ API Call Error:', error)
    console.error('❌ Error Type:', typeof error)
    console.error('❌ Error Details:', JSON.stringify(error, null, 2))
    if (error instanceof Error) {
      console.error('❌ Error Message:', error.message)
      console.error('❌ Error Stack:', error.stack)
    }
    throw error
  }
}

// 토큰 갱신 함수
const refreshToken = async (): Promise<string | null> => {
  try {
    const currentToken = (global as any).token
    if (!currentToken) return null

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    })

    if (response.ok) {
      const data = await response.json()
      const newToken = data.token

      // 새 토큰을 글로벌 변수와 AsyncStorage에 저장
      ;(global as any).token = newToken
      await AsyncStorage.setItem('authToken', newToken)

      return newToken
    }
  } catch (error) {
    // 토큰 갱신 실패
  }

  return null
}

// 데이터베이스 초기화 (백엔드 서버 연결 확인)
export const initDatabase = async (): Promise<void> => {
  try {
    // 백엔드 서버 상태 확인 (루트 경로 사용)
    const healthUrl = `${API_BASE_URL.replace('/api', '')}/api/health`
    console.log('🔗 백엔드 서버 연결 확인 중:', healthUrl)
    const response = await fetch(healthUrl)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    console.log('✅ 백엔드 서버 연결 성공')
  } catch (error: unknown) {
    console.error('❌ 백엔드 서버 연결 실패:', (error as Error).message)
    throw error
  }
}

// 사용자 관련 API
export const authAPI = {
  // 회원가입
  signup: async (
    username: string,
    email: string,
    password: string,
    studentId?: string,
    photo?: any
  ) => {
    // FormData를 사용하여 이미지와 텍스트 데이터 함께 전송
    const formData = new FormData()
    formData.append('username', username)
    formData.append('email', email)
    formData.append('password', password)
    if (studentId) {
      formData.append('studentId', studentId)
    }

    if (photo) {
      formData.append('idCardImage', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.name || 'id_card.jpg',
      } as any)
    }

    return apiCall('/auth/signup', {
      method: 'POST',
      headers: {
        // FormData 사용 시 Content-Type 헤더 제거 (브라우저가 자동 설정)
      },
      body: formData,
    })
  },

  // 로그인
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })
  },
}

// 경매 관련 API
export const auctionAPI = {
  // 모든 활성 경매 조회
  getActiveAuctions: async () => {
    return apiCall('/auctions')
  },

  // 종료된 경매 조회
  getEndedAuctions: async () => {
    return apiCall('/auctions/ended')
  },

  // 핫한 경매 조회
  getHotAuction: async () => {
    return apiCall('/auctions/hot')
  },

  // 특정 경매 조회
  getAuction: async (id: string) => {
    return apiCall(`/auctions/${id}`)
  },

  // 새 경매 생성
  createAuction: async (
    data: {
      title: string
      description: string
      startingPrice: number
      endTime?: string
    },
    token: string
  ) => {
    return apiCall('/auctions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  },

  // 입찰
  createBid: async (auctionId: string, amount: number, token: string) => {
    return apiCall(`/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    })
  },

  // 경매 종료
  endAuction: async (auctionId: string, token: string) => {
    return apiCall(`/auctions/${auctionId}/end`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}

// 사용자 관련 API
export const userAPI = {
  // 프로필 조회
  getProfile: async (token: string) => {
    return apiCall('/users/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  // 프로필 업데이트
  updateProfile: async (
    data: { username?: string; email?: string },
    token: string
  ) => {
    return apiCall('/users/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })
  },

  // 사용자 경매 조회
  getUserAuctions: async (token: string) => {
    return apiCall('/users/auctions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },

  // 사용자 입찰 조회
  getUserBids: async (token: string) => {
    return apiCall('/users/bids', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  },
}
