import React from 'react';
import Leaves from './Leaves';
import styled from 'styled-components';

const ModalBg = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  background: transparent;

  /* как в модалке "Отработка отгулов" */
  @media (min-width: 980px) {
    padding-left: calc(380px + max((100vw - 380px - 1200px)/2, 0px));
  }
`;

const ModalBox = styled.div`
  position: relative;
  width: 1170px;
  min-width: 600px;
  max-width: 1200px;
  height: 92vh;
  margin: 32px 0;
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 28px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.15);
  padding: 40px 48px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  z-index: 10000;
  color: #fff;

  @media (max-width: 980px) {
    border-radius: 20px;
    width: 100%;
    min-width: 0;
    max-width: none;
    height: calc(100vh - 24px);
    margin: 12px;
    padding: 22px 16px;
  }
`;

const CloseBtn = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 28px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  font-weight: 900;
  z-index: 1003;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s, color 0.3s;
  &:hover { background: rgba(34, 197, 94, 0.18); color: #43e97b; }
`;

export default function LeaveCalendarModal({ open, onClose }) {
  if (!open) return null;
  return (
    <ModalBg onClick={onClose}>
      <ModalBox onClick={e => e.stopPropagation()}>
        <CloseBtn onClick={onClose} title="Закрыть окно">×</CloseBtn>
        <Leaves token={localStorage.getItem('token')} hideTime={true} fullWidth={true} />
      </ModalBox>
    </ModalBg>
  );
}