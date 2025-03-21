import React, { useState, useEffect, useRef } from 'react';

const CalendarTextGenerator = ({ 
  events, 
  onDateSelect, 
  isAuthenticated, 
  userInfo, 
  handleLogin, 
  handleLogout, 
  isLoading, 
  isApiInitialized,
  calendars,
  toggleCalendarSelection,
  calendarSettings,
  updateCalendarSettings
}) => {
  const weekdays = ['月', '火', '水', '木', '金', '土', '日'];
  const timeSlots = Array.from({ length: 14 }, (_, i) => `${i + 8}:00`);
  const [selectedDates, setSelectedDates] = useState(new Map());
  const [generatedText, setGeneratedText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState([]);
  const today = new Date();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOperation, setDragOperation] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [popupMonth, setPopupMonth] = useState(new Date());
  const popupRef = useRef();
  const [currentTimePosition, setCurrentTimePosition] = useState(0);
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const textAreaRef = useRef(null);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const settingsPopupRef = useRef();

  // Custom hook for viewport height
  const useViewportHeight = () => {
    const [viewportHeight, setViewportHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        // 初期値を設定
        setViewportHeight(window.innerHeight);
        
        const handleResize = () => {
          const vh = window.innerHeight;
          const previousHeight = viewportHeight;
          
          if (previousHeight - vh > 100) {
            setIsKeyboardVisible(true);
            setKeyboardHeight(previousHeight - vh);
          } else if (vh - previousHeight > 100) {
            setIsKeyboardVisible(false);
            setKeyboardHeight(0);
          }
          
          setViewportHeight(vh);
          document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
          setTimeout(handleResize, 100);
        });
        window.addEventListener('scroll', () => {
          setTimeout(handleResize, 100);
        });

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('orientationchange', handleResize);
          window.removeEventListener('scroll', handleResize);
        };
      }
    }, [viewportHeight]);

    return { viewportHeight, isKeyboardVisible, keyboardHeight };
  };

  const { viewportHeight, isKeyboardVisible, keyboardHeight } = useViewportHeight();

  // Week dates calculation
  useEffect(() => {
    const currentDay = new Date(currentDate);
    const day = currentDay.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(currentDay);
    monday.setDate(currentDay.getDate() + mondayOffset);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    
    setWeekDates(dates);
    
    if (onDateSelect) {
      onDateSelect(currentDay);
    }
  }, [currentDate, onDateSelect]);

  // Navigation functions
  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date-time key generation
  const getDateTimeKey = (date, timeIndex) => {
    const d = new Date(date);
    d.setHours(timeIndex + 8, 0, 0, 0);
    return d.toISOString();
  };

  // Cell interaction handlers
  const handleCellClick = (dayIndex, timeIndex) => {
    if (isLongPress) return;
    
    const date = weekDates[dayIndex];
    if (!date) return;

    // 予定の有無に関わらず選択可能にする (isTimeSlotOccupiedのチェックを削除)
    const key = getDateTimeKey(date, timeIndex);
    const newSelectedDates = new Map(selectedDates);
    
    if (selectedDates.has(key)) {
      newSelectedDates.delete(key);
    } else {
      newSelectedDates.set(key, true);
    }
    
    setSelectedDates(newSelectedDates);
  };

  const handleCellMouseDown = (dayIndex, timeIndex) => {
    const date = weekDates[dayIndex];
    if (!date) return;

    // 予定の有無に関わらず選択可能にする (isTimeSlotOccupiedのチェックを削除)
    const timer = setTimeout(() => {
      const key = getDateTimeKey(date, timeIndex);
      const newSelectedDates = new Map(selectedDates);
      const newValue = !selectedDates.has(key);
      
      if (newValue) {
        newSelectedDates.set(key, true);
      } else {
        newSelectedDates.delete(key);
      }
      
      setSelectedDates(newSelectedDates);
      setIsDragging(true);
      setDragOperation(newValue);
      setIsLongPress(true);
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleCellMouseEnter = (dayIndex, timeIndex) => {
    if (isDragging && dragOperation !== null) {
      const date = weekDates[dayIndex];
      if (!date) return;

      // 予定の有無に関わらず選択可能にする (isTimeSlotOccupiedのチェックを削除)
      const key = getDateTimeKey(date, timeIndex);
      const newSelectedDates = new Map(selectedDates);
      
      if (dragOperation) {
        newSelectedDates.set(key, true);
      } else {
        newSelectedDates.delete(key);
      }
      
      setSelectedDates(newSelectedDates);
    }
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isDragging) {
      setIsDragging(false);
      setDragOperation(null);
      
      setTimeout(() => {
        setIsLongPress(false);
      }, 50);
    }
  };

  // Touch event handlers
  const handleTouchMove = (e) => {
    if (!isLongPress) return;
    
    if (isDragging && typeof document !== 'undefined') {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      
      if (element && element.dataset.dayIndex !== undefined && element.dataset.timeIndex !== undefined) {
        e.preventDefault();
        
        const dayIndex = parseInt(element.dataset.dayIndex);
        const timeIndex = parseInt(element.dataset.timeIndex);
        handleCellMouseEnter(dayIndex, timeIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Text generation
  const generateText = (dates = selectedDates) => {
    let text = '';
    const dateGroups = new Map();
    
    dates.forEach((_, key) => {
      const date = new Date(key);
      const dateKey = date.toDateString();
      const hour = date.getHours();
      
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey).push(hour);
    });

    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => new Date(a) - new Date(b));
    
    sortedDates.forEach(dateKey => {
      const date = new Date(dateKey);
      const hours = dateGroups.get(dateKey).sort((a, b) => a - b);
      
      if (hours.length > 0) {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const jpWeekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        
        text += `${month}月${day}日(${jpWeekday}) `;
        
        let startHour = null;
        let endHour = null;
        
        hours.forEach(hour => {
          if (startHour === null) {
            startHour = hour;
            endHour = hour + 1;
          } else if (hour === endHour) {
            endHour = hour + 1;
          } else {
            text += `${startHour}:00-${endHour}:00 `;
            startHour = hour;
            endHour = hour + 1;
          }
        });
        
        if (startHour !== null) {
          text += `${startHour}:00-${endHour}:00 `;
        }
        
        text += '\n';
      }
    });
    
    setGeneratedText(text.trim());
  };

  // Effect for text generation
  useEffect(() => {
    generateText();
  }, [selectedDates, weekDates]);

  // Utility functions
  const resetSelection = () => {
    setSelectedDates(new Map());
    setGeneratedText('');
  };

  const copySelectedDates = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(generatedText)
        .then(() => {
          alert('テキストをコピーしました');
        })
        .catch(err => {
          console.error('コピーに失敗しました', err);
        });
    }
  };

  const isMobileDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Check if time slot is occupied by an event
  const isTimeSlotOccupied = (date, hour) => {
    if (!date || !events || !events.length) return false;

    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    for (const event of events) {
      // 終日予定の場合は特別処理
      if (isAllDayEvent(event)) {
        const eventDate = new Date(event.start.date);
        // 日付のみを比較（時間は無視）
        const isSameDay = 
          date.getFullYear() === eventDate.getFullYear() && 
          date.getMonth() === eventDate.getMonth() && 
          date.getDate() === eventDate.getDate();
        
        // 終日予定があっても、チェックが入っていればfalseを返す（選択可能）
        if (isSameDay) {
          if (calendarSettings.allowAllDayEvents) {
            continue; // 終日予定は無視して次のイベントをチェック
          } else {
            return true; // チェックがなければ選択不可
          }
        }
      }

      // 未回答予定の場合
      if (isTentativeEvent(event)) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        if (slotStart < eventEnd && slotEnd > eventStart) {
          // 未回答予定があっても、チェックが入っていればfalseを返す（選択可能）
          if (calendarSettings.allowTentativeEvents) {
            continue; // 未回答予定は無視して次のイベントをチェック
          } else {
            return true; // チェックがなければ選択不可
          }
        }
      }
      
      // その他の通常予定の場合
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        return true; // 通常予定は常に選択不可
      }
    }
    
    return false; // どのイベントにも該当しない場合は選択可能
  };

  // Get event for a specific time slot
  const getEventForTimeSlot = (date, hour) => {
    if (!date || !events || !events.length) return null;

    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    for (const event of events) {
      // 終日予定の場合
      if (isAllDayEvent(event)) {
        const eventDate = new Date(event.start.date);
        // 日付のみを比較（時間は無視）
        const isSameDay = 
          date.getFullYear() === eventDate.getFullYear() && 
          date.getMonth() === eventDate.getMonth() && 
          date.getDate() === eventDate.getDate();
        
        // 終日予定がある日で、チェックされていない場合のみイベントを返す
        if (isSameDay && !calendarSettings.allowAllDayEvents) {
          event.isAllDay = true;
          event.isTentative = isTentativeEvent(event);
          event.isSelectable = false;
          return event;
        }
        // チェックがついている場合は、この日の終日予定は無視
        if (isSameDay) {
          continue;
        }
      }

      // 未回答予定の場合
      if (isTentativeEvent(event)) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        if (slotStart < eventEnd && slotEnd > eventStart) {
          // 未回答予定で、チェックされていない場合のみイベントを返す
          if (!calendarSettings.allowTentativeEvents) {
            event.isAllDay = isAllDayEvent(event);
            event.isTentative = true;
            event.isSelectable = false;
            return event;
          }
          // チェックがついている場合は、この時間の未回答予定は無視
          continue;
        }
      }

      // 通常予定の場合
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      if (slotStart < eventEnd && slotEnd > eventStart) {
        event.isAllDay = isAllDayEvent(event);
        event.isTentative = isTentativeEvent(event);
        event.isSelectable = true;
        return event;
      }
    }
    
    return null;
  };

  // Format event time
  const formatEventTime = (event) => {
    if (!event) return '';
    
    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);
    
    const startHour = start.getHours();
    const startMinute = start.getMinutes();
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    
    const startTime = `${startHour}:${startMinute === 0 ? '00' : startMinute}`;
    const endTime = `${endHour}:${endMinute === 0 ? '00' : endMinute}`;
    
    return `${startTime}-${endTime}`;
  };

  // Format event title
  const formatEventTitle = (event) => {
    if (!event || !event.summary) return '';
    
    // 長いタイトルを省略（より短く）
    return event.summary.length > 6 ? `${event.summary.substring(0, 4)}..` : event.summary;
  };

  // Selected slots calculation
  const getSelectedSlots = () => {
    const slots = Array(7).fill().map(() => Array(14).fill(false));
    
    weekDates.forEach((date, dayIndex) => {
      if (!date) return;
      
      for (let timeIndex = 0; timeIndex < 14; timeIndex++) {
        const key = getDateTimeKey(date, timeIndex);
        if (selectedDates.has(key)) {
          slots[dayIndex][timeIndex] = true;
        }
      }
    });
    
    return slots;
  };

  // Calendar popup rendering
  const renderCalendarPopup = () => {
    if (!showCalendarPopup) return null;
    
    const firstDayOfMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth() + 1, 0);
    let firstDayOfWeek = firstDayOfMonth.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const daysInMonth = lastDayOfMonth.getDate();
    const lastDayOfPrevMonth = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), 0);
    const daysInPrevMonth = lastDayOfPrevMonth.getDate();
    const rows = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
    const weekdaysForPopup = ['月', '火', '水', '木', '金', '土', '日'];
    
    return (
      <div 
        ref={popupRef}
        className="absolute top-10 left-0 bg-white shadow-lg rounded-lg z-50 p-2"
        style={{ 
          width: '300px',
          border: '1px solid #CB8585'
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => {
              const newMonth = new Date(popupMonth);
              newMonth.setMonth(popupMonth.getMonth() - 1);
              setPopupMonth(newMonth);
            }}
            className="p-1"
          >
            &lt;
          </button>
          <div className="font-bold">
            {popupMonth.getFullYear()}年{popupMonth.getMonth() + 1}月
          </div>
          <button 
            onClick={() => {
              const newMonth = new Date(popupMonth);
              newMonth.setMonth(popupMonth.getMonth() + 1);
              setPopupMonth(newMonth);
            }}
            className="p-1"
          >
            &gt;
          </button>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {weekdaysForPopup.map((day, index) => (
                <th key={index} className="text-center text-xs p-1">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 7 }).map((_, colIndex) => {
                  const dayNumber = rowIndex * 7 + colIndex - firstDayOfWeek + 1;
                  const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                  const prevMonthDay = daysInPrevMonth - firstDayOfWeek + colIndex + 1;
                  const nextMonthDay = dayNumber - daysInMonth;
                  const displayDay = isCurrentMonth 
                    ? dayNumber 
                    : (dayNumber <= 0 ? prevMonthDay : nextMonthDay);
                  
                  let dateObj;
                  if (isCurrentMonth) {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth(), dayNumber);
                  } else if (dayNumber <= 0) {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth() - 1, prevMonthDay);
                  } else {
                    dateObj = new Date(popupMonth.getFullYear(), popupMonth.getMonth() + 1, nextMonthDay);
                  }
                  
                  const isToday = dateObj.getDate() === today.getDate() && 
                                dateObj.getMonth() === today.getMonth() && 
                                dateObj.getFullYear() === today.getFullYear();
                  
                  const isInSelectedWeek = weekDates.some(date => 
                    date && date.getDate() === dateObj.getDate() && 
                    date.getMonth() === dateObj.getMonth() && 
                    date.getFullYear() === dateObj.getFullYear()
                  );
                  
                  return (
                    <td 
                      key={colIndex} 
                      className={`text-center p-1 cursor-pointer ${
                        isCurrentMonth ? '' : 'text-gray-400'
                      } ${
                        isInSelectedWeek ? 'bg-red-100' : ''
                      }`}
                      onClick={() => {
                        setCurrentDate(dateObj);
                        setShowCalendarPopup(false);
                      }}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 mx-auto ${
                        isToday ? 'bg-red-400 text-white rounded-full' : ''
                      }`}>
                        {displayDay}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Current time position calculation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const calculateTimePosition = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours >= 8 && hours < 22) {
        const fiveMinuteInterval = Math.floor(minutes / 5);
        const cellHeight = 36; // 調整されたセルの高さ
        const hourPosition = (hours - 8) * cellHeight;
        const minutePosition = (fiveMinuteInterval * 5 / 60) * cellHeight;
        
        setCurrentTimePosition(hourPosition + minutePosition);
      } else {
        setCurrentTimePosition(-1);
      }
    };
    
    calculateTimePosition();
    const interval = setInterval(calculateTimePosition, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Click outside popup handler
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowCalendarPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popupRef]);

  // Document-level event listeners
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, longPressTimer]);

  // Touch event handler for document
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleDocumentTouchMove = (e) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', handleDocumentTouchMove);
    };
  }, [isDragging]);

  // Text area focus handler
  const handleTextAreaFocus = () => {
    setIsTextAreaFocused(true);
    
    if (textAreaRef.current && typeof window !== 'undefined') {
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const delay = isIOS ? 500 : 300;
      
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
        
        textAreaRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, delay);
    }
  };

  // Settings popup click handler
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleClickOutside = (event) => {
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
        setShowSettingsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [settingsPopupRef]);

  // Settings popup rendering
  const renderSettingsPopup = () => {
    if (!showSettingsPopup || !isAuthenticated) return null;
    
    return (
      <div 
        ref={settingsPopupRef}
        className="absolute top-12 right-2 bg-white shadow-lg rounded-lg z-50 p-3"
        style={{ 
          width: '280px',
          border: '1px solid #ddd',
          maxHeight: '540px',
          overflowY: 'auto'
        }}
      >
        <div className="font-bold mb-2 pb-2 border-b border-gray-200">カレンダー設定</div>
        
        <div className="text-sm text-gray-700 mb-2">表示するカレンダーを選択</div>
        
        {/* カレンダー選択の操作ボタン */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => {
              calendars.forEach(calendar => {
                if (calendar.selected) {
                  toggleCalendarSelection(calendar.id);
                }
              });
            }}
            className="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            すべて解除
          </button>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {calendars.map(calendar => (
            <div key={calendar.id} className="flex items-center">
              <input
                type="checkbox"
                id={`calendar-${calendar.id}`}
                checked={calendar.selected}
                onChange={() => toggleCalendarSelection(calendar.id)}
                className="mr-2"
              />
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: calendar.color }}
              ></div>
              <label 
                htmlFor={`calendar-${calendar.id}`}
                className="text-sm text-gray-800 truncate"
                style={{ maxWidth: '200px' }}
              >
                {calendar.name}
              </label>
            </div>
          ))}
        </div>
        
        {calendars.length <= 1 && (
          <div className="text-xs text-gray-500 mt-2 mb-4">
            共有カレンダーがありません。Google カレンダーで他の人のカレンダーを追加すると、ここに表示されます。
          </div>
        )}

        {/* 終日予定や未回答予定の設定 */}
        <div className="mt-4 border-t border-gray-200 pt-3">
          <div className="font-bold text-sm mb-2">予定の表示設定</div>
          
          {/* 終日予定の設定 */}
          <div className="flex items-center my-3">
            <input
              type="checkbox"
              id="allow-all-day-events"
              checked={calendarSettings.allowAllDayEvents}
              onChange={(e) => updateCalendarSettings('allowAllDayEvents', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allow-all-day-events" className="text-sm text-gray-800">
              終日予定がある日を表示しない
            </label>
          </div>
          
          {/* 未回答予定の設定 */}
          <div className="flex items-center my-3">
            <input
              type="checkbox"
              id="allow-tentative-events"
              checked={calendarSettings.allowTentativeEvents}
              onChange={(e) => updateCalendarSettings('allowTentativeEvents', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="allow-tentative-events" className="text-sm text-gray-800">
              未回答/未定の予定がある時間を表示しない
            </label>
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            チェックを入れると、その予定がある時間も選択できるようになります。
          </div>
        </div>
      </div>
    );
  };

  // Event color
  const getEventColor = (event) => {
    return event.calendarColor || '#4285F4';
  };

  // 予定の種類を判定する関数
  const isAllDayEvent = (event) => {
    return event.start.date !== undefined;
  };

  const isTentativeEvent = (event) => {
    return event.status === 'tentative' || 
           (event.attendees && event.attendees.some(attendee => 
             (attendee.email === userInfo?.emailAddresses?.[0]?.value) && 
             (attendee.responseStatus === 'needsAction' || attendee.responseStatus === 'tentative')
           ));
  };

  // イベントがスロットで選択可能かどうかを判定
  const isEventSelectable = (event) => {
    if (isAllDayEvent(event) && !calendarSettings.allowAllDayEvents) {
      return false;
    }
    
    if (isTentativeEvent(event) && !calendarSettings.allowTentativeEvents) {
      return false;
    }
    
    return true;
  };

  // イベントの表示を更新
  const renderEventCell = (event, isOccupied, isSelected) => {
    // イベントの種類に応じたスタイルを設定
    let opacity = 0.7;
    let textColor = 'text-white'; // 常に白色に固定
    let hintText = '';
    let showTitle = true;
    let showEvent = true;
    
    if (event) {
      // 終日予定
      if (event.isAllDay) {
        opacity = 0.6;
        hintText = '終日';
        
        // 終日予定で選択可能な場合は予定を完全に表示しない（空きスロットとして扱う）
        if (calendarSettings.allowAllDayEvents) {
          showEvent = false;
        }
      }
      
      // 未回答予定
      if (event.isTentative) {
        opacity = 0.5;
        hintText = '未定';
        
        // 未回答予定で選択可能な場合は予定を完全に表示しない（空きスロットとして扱う）
        if (calendarSettings.allowTentativeEvents) {
          showEvent = false;
        }
      }
    }
    
    // 予定を表示しない場合は、空きスロットと同じ表示にする
    if (!showEvent) {
      return (
        <div className={`w-10 h-10 aspect-square rounded-md flex items-center justify-center ${
          isSelected ? 'bg-red-300 ring-2 ring-red-500' : 'bg-red-100'
        }`}>
        </div>
      );
    }
    
    // 選択状態に応じたスタイルを適用
    const selectedStyle = isSelected 
      ? { 
          boxShadow: 'inset 0 0 0 2px rgba(244, 63, 94, 0.8)'
        } 
      : {};
    
    // 予定のセルに視認性の高い境界線を追加
    const occupiedBorderStyle = isOccupied 
      ? {
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.4), 0 1px 2px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        } 
      : {};
    
    return (
      <div 
        className={`w-10 h-10 aspect-square rounded-md flex items-center justify-center ${
          isOccupied ? 'bg-gray-200' :
          isSelected ? 'bg-red-300' : 'bg-red-100'
        }`} 
        style={{ 
          backgroundColor: isOccupied ? getEventColor(event) : (isSelected ? '#FDA4AF' : '#FEE2E2'),
          opacity: isOccupied ? opacity : 1,
          position: 'relative',
          ...selectedStyle,
          ...occupiedBorderStyle
        }}
      >
        {isOccupied && showTitle && (
          <div className={`text-xs ${textColor} overflow-hidden text-center leading-none px-0.5 flex flex-col`} style={{ maxWidth: '100%', maxHeight: '100%' }}>
            {hintText && <span className="text-[6px] opacity-80">{hintText}</span>}
            <span>{formatEventTitle(event)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto overflow-hidden"
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleMouseUp}
      style={{ overscrollBehavior: 'none' }}
    >
      {/* ヘッダー部分 */}
      <div className="flex-shrink-0">
        {/* 統合されたヘッダー - アプリタイトルとログイン/ユーザー情報を含む */}
        <div className="bg-white p-1 sm:p-2 flex justify-between items-center shadow-sm border-b border-gray-200" 
          style={{ height: 'auto', minHeight: '48px' }}>
          {/* 左側：アプリタイトル */}
          <div className="text-sm sm:text-base font-bold text-gray-800">
            メイクミー日程調整
          </div>
          
          {/* 右側：ログインボタンまたはユーザー情報 */}
          <div className="flex items-center space-x-2">
            {/* ログイン/ユーザー情報 */}
            {isAuthenticated ? (
              <div className="flex items-center">
                {userInfo?.photos?.[0]?.url && (
                  <img
                    src={userInfo.photos[0].url}
                    alt="ユーザー"
                    className="h-7 w-7 rounded-full cursor-pointer"
                    onClick={handleLogout}
                    title="ログアウト"
                  />
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoading || !isApiInitialized}
                className="flex items-center justify-center rounded-full bg-red-400 hover:bg-red-500 text-white w-8 h-8 focus:outline-none"
                title="Googleでログイン"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="#ffffff"/>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* カレンダーナビゲーションヘッダー */}
        <div className="bg-white p-2 sm:p-3 flex justify-between items-center border-b border-gray-200">
          {/* 左端：月表示と選択ボタン */}
          <div className="flex items-center relative w-1/3 justify-start">
            <button 
              onClick={() => {
                setShowCalendarPopup(!showCalendarPopup);
                setPopupMonth(new Date(currentDate));
              }}
              className="flex items-center p-1 hover:bg-gray-100 rounded"
            >
              <span className="text-sm sm:text-base font-bold">
                {weekDates.length > 0 ? `${weekDates[0].getMonth() + 1}月` : ''}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 ml-1">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {renderCalendarPopup()}
          </div>
          
          {/* 中央：ナビゲーションボタン */}
          <div className="flex items-center justify-center w-1/3">
            <div className="flex items-center space-x-1 sm:space-x-3">
              <button onClick={previousWeek} className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg rounded-full hover:bg-gray-100">&lt;</button>
              <button onClick={goToToday} className="px-3 py-1 text-gray-600 text-sm font-bold rounded-full hover:bg-gray-100 whitespace-nowrap min-w-[60px]">今日</button>
              <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg rounded-full hover:bg-gray-100">&gt;</button>
            </div>
          </div>
          
          {/* 右端：設定アイコン */}
          <div className="flex items-center w-1/3 justify-end">
            {isAuthenticated && (
              <button
                onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                className="flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 w-10 h-10 focus:outline-none"
                title="カレンダー設定"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* 設定ポップアップ */}
          {renderSettingsPopup()}
        </div>
      </div>

      {/* カレンダーグリッド部分（フレックス拡張で残りの高さを埋める） */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {/* 曜日ヘッダー */}
          <div className="sticky top-0 z-10 bg-white">
            <div className="flex border-b border-gray-200">
              {/* 時間列ヘッダー */}
              <div className="w-16 flex-none"></div>
              
              {/* 曜日列ヘッダー */}
              <div className="flex-1 grid grid-cols-7">
                {weekdays.map((day, index) => (
                  <div key={index} className="text-center py-2">
                    <div className="text-xs text-gray-500">{day}</div>
                    <div className={`text-base font-bold ${index === todayIndex ? 'bg-red-400 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}>
                      {weekDates[index] ? weekDates[index].getDate() : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 時間スロット */}
          <div className="flex">
            {/* 時間列 */}
            <div className="w-16 flex-none">
              {timeSlots.map((time, index) => (
                <div key={index} className="h-10 flex items-center justify-center text-xs text-gray-500 border-b border-gray-100">
                  {time}
                </div>
              ))}
            </div>
            
            {/* カレンダーグリッド */}
            <div className="flex-1">
              <table className="w-full border-collapse">
                <tbody>
                  {timeSlots.map((_, timeIndex) => (
                    <tr key={timeIndex} className="border-t-[4px] border-b-[4px] border-white">
                      {weekDates.map((date, dayIndex) => {
                        const isToday = dayIndex === todayIndex;
                        const key = getDateTimeKey(date, timeIndex);
                        const isSelected = selectedDates.has(key);
                        const event = getEventForTimeSlot(date, timeIndex + 8);
                        const isOccupied = isTimeSlotOccupied(date, timeIndex + 8);
                        
                        return (
                          <td 
                            key={dayIndex} 
                            className="relative p-0 border-l-[2px] border-r-[2px] border-white select-none cursor-pointer"
                            onClick={() => handleCellClick(dayIndex, timeIndex)}
                            onMouseDown={() => handleCellMouseDown(dayIndex, timeIndex)}
                            onMouseEnter={() => isDragging && handleCellMouseEnter(dayIndex, timeIndex)}
                            onTouchStart={() => handleCellMouseDown(dayIndex, timeIndex)}
                            data-day-index={dayIndex}
                            data-time-index={timeIndex}
                          >
                            <div className="flex justify-center py-1">
                              {renderEventCell(event, isOccupied, isSelected)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* フッターエリア（ボタンなど） */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-white">
        <div className="text-sm text-center text-gray-500 mb-3">
          カレンダーで選択した日時が、自動で入力されます。
        </div>
        <div className="flex justify-center space-x-4">
          <button
            onClick={resetSelection}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
          >
            リセット
          </button>
          <button
            onClick={copySelectedDates}
            className="px-6 py-2 bg-red-400 text-white rounded-full hover:bg-red-500 transition-colors"
          >
            文字をコピー
          </button>
        </div>
      </div>

      {/* メッセージトースト */}
      {toast.show && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CalendarTextGenerator; 