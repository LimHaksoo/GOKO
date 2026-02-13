import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the split view layout with canvas panel', () => {
    render(<App />);
    // 캔버스 빈 상태 메시지가 보여야 함
    expect(screen.getByText(/지도에서 지역을 선택하세요/i)).toBeInTheDocument();
  });

  it('renders the collapse toggle button', () => {
    render(<App />);
    const toggleButton = screen.getByRole('button', { name: /지도/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders the map panel', () => {
    render(<App />);
    // 맵 패널 영역이 존재 (로딩 중이거나 에러 상태)
    const mapPanel = document.querySelector('.map-panel');
    expect(mapPanel).toBeInTheDocument();
  });

  it('renders the canvas toolbar with create trip button', () => {
    render(<App />);
    // "여행 만들기" 버튼이 있어야 함
    const tripButton = screen.getByRole('button', { name: /여행 만들기/i });
    expect(tripButton).toBeInTheDocument();
    // 장소가 없으므로 비활성화 상태
    expect(tripButton).toBeDisabled();
  });

  it('shows place count in toolbar', () => {
    render(<App />);
    // 초기에는 장소 선택 안내 메시지
    expect(screen.getByText(/장소를 선택하세요/i)).toBeInTheDocument();
  });
});
