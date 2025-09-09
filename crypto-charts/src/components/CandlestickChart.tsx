import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { calculateRSI, calculateMACD, calculateBollingerBands } from '../utils/technicalIndicators';
import { detectAllPatterns, PatternResult } from '../utils/candlestickPatterns';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartProps {
  symbol: string;
  data: CandleData[];
  chartType: string;
  timeframe: string;
  historicalPeriod: string;
  indicators: string[];
  showPatterns?: boolean;
  selectedPatterns?: string[];
}

const CandlestickChart: React.FC<ChartProps> = ({ symbol, data, chartType, timeframe, historicalPeriod, indicators, showPatterns = true, selectedPatterns = [] }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const indicatorSeriesRef = useRef<{ [key: string]: any }>({});
  
  // State for displaying current candle data
  const [currentData, setCurrentData] = useState<CandleData | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) {
      console.error('Chart container ref is not available');
      return;
    }

    try {
      // Create the trading chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#161a25' },
        textColor: '#d1d4dc',
        fontSize: 11,
        fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      },
      grid: {
        vertLines: {
          color: 'rgba(240, 243, 250, 0.06)',
          style: 0,
          visible: true,
        },
        horzLines: {
          color: 'rgba(240, 243, 250, 0.06)',
          style: 0,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      rightPriceScale: {
        borderColor: 'rgba(240, 243, 250, 0.1)',
        scaleMargins: {
          top: 0.02,
          bottom: 0.02,
        },
        borderVisible: true,
        entireTextOnly: false,
        ticksVisible: true,
        alignLabels: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: 'rgba(240, 243, 250, 0.1)',
        timeVisible: true,
        secondsVisible: false,
        borderVisible: true,
        rightOffset: 12,
        barSpacing: 6,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: false,
        rightBarStaysOnScroll: false,
        visible: true,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
          } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
          } else {
            return date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: '2-digit'
            });
          }
        },
      },
      crosshair: {
        mode: 0, // Normal crosshair mode
        vertLine: {
          width: 1,
          color: 'rgba(240, 243, 250, 0.4)',
          style: 2, // Dashed
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          width: 1,
          color: 'rgba(240, 243, 250, 0.4)',
          style: 2, // Dashed
          visible: true,
          labelVisible: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
        axisDoubleClickReset: true,
      },
    });

    // Create series based on chart type
    let series: any;
    
    if (chartType === 'line') {
      series = (chart as any).addLineSeries({
        color: '#2196f3',
        lineWidth: 2,
        lineType: 0, // Simple line
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        crosshairMarkerBorderColor: '#2196f3',
        crosshairMarkerBackgroundColor: '#161a25',
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#2196f3',
        priceLineStyle: 2,
      });
    } else if (chartType === 'heikin-ashi') {
      // For Heikin Ashi, we'll use candlestick series with TradingView colors
      series = (chart as any).addCandlestickSeries({
        upColor: '#089981',
        downColor: '#f23645',
        borderVisible: true,
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
        borderUpColor: '#089981',
        borderDownColor: '#f23645',
        wickVisible: true,
        priceLineVisible: true,
      });
    } else {
      // Default candlestick - True TradingView style
      series = (chart as any).addCandlestickSeries({
        upColor: '#089981',
        downColor: '#f23645',
        borderVisible: true,
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
        borderUpColor: '#089981', 
        borderDownColor: '#f23645',
        wickVisible: true,
        priceLineVisible: true,
        baseLineVisible: false,
      });
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = series;
    indicatorSeriesRef.current = {}; // Reset indicators when chart recreates

    // Add crosshair move event handler to update current data display
    chart.subscribeCrosshairMove((param: any) => {
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.y < 0) {
        setCurrentData(null);
        return;
      }

      // Find the candle data at the crosshair position
      const candleData = data.find((candle: CandleData) => candle.time === param.time);
      if (candleData) {
        setCurrentData(candleData);
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  }, [chartType]); // Recreate chart when chart type changes

  useEffect(() => {
    if (candlestickSeriesRef.current && data.length > 0) {
      try {
        console.log('📊 Chart data sample:', data.slice(0, 3));
      
      let formattedData: any[];
      
      // Helper function to ensure proper time formatting
      const formatTime = (timestamp: number) => {
        // Convert to seconds if it's in milliseconds
        if (timestamp > 9999999999) {
          return Math.floor(timestamp / 1000);
        }
        return timestamp;
      };
      
      if (chartType === 'line') {
        // For line chart, use only close prices
        formattedData = data.map(candle => ({
          time: formatTime(candle.time),
          value: candle.close
        }));
      } else if (chartType === 'heikin-ashi') {
        // Transform to Heikin Ashi candlesticks
        formattedData = [];
        let prevHA = { open: data[0].open, close: data[0].close };
        
        for (let i = 0; i < data.length; i++) {
          const candle = data[i];
          const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
          const haOpen = i === 0 ? candle.open : (prevHA.open + prevHA.close) / 2;
          const haHigh = Math.max(candle.high, haOpen, haClose);
          const haLow = Math.min(candle.low, haOpen, haClose);
          
          const haCandle = {
            time: formatTime(candle.time),
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose
          };
          
          formattedData.push(haCandle);
          prevHA = { open: haOpen, close: haClose };
        }
      } else {
        // Regular candlestick data
        formattedData = data.map(candle => ({
          time: formatTime(candle.time),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close
        }));
      }
      
      console.log('📊 Formatted data sample:', formattedData.slice(0, 3));
      
      candlestickSeriesRef.current.setData(formattedData);
      
      // Position chart to show most recent data (rightmost)
      if (chartRef.current && formattedData.length > 0) {
        const timeScale = chartRef.current.timeScale();
        // Show the most recent ~50 bars
        const visibleBars = Math.min(50, formattedData.length);
        const lastIndex = formattedData.length - 1;
        const startIndex = Math.max(0, lastIndex - visibleBars + 1);
        
        timeScale.setVisibleRange({
          from: formattedData[startIndex].time,
          to: formattedData[lastIndex].time
        });
      }
      } catch (error) {
        console.error('Error setting chart data:', error);
      }
    }
  }, [data, chartType]);

  // Handle indicators
  useEffect(() => {
    if (!chartRef.current || data.length < 50) return; // Need enough data for indicators
    
    // Extra check to ensure chart is still valid
    if (!chartRef.current || typeof chartRef.current.removeSeries !== 'function') {
      console.warn('Chart reference is invalid, skipping indicator update');
      return;
    }
    
    try {
      // Remove existing indicator series
      Object.values(indicatorSeriesRef.current).forEach((series: any) => {
        try {
          chartRef.current?.removeSeries(series);
        } catch (error) {
          console.error('Error removing series:', error);
        }
      });
      indicatorSeriesRef.current = {};
      
      // Add new indicator series
      indicators.forEach(indicator => {
      if (indicator === 'RSI') {
        try {
          const rsiData = calculateRSI(data);
          if (rsiData.length > 0 && rsiData.every(d => typeof d.value === 'number' && !isNaN(d.value))) {
          const rsiSeries = (chartRef.current as any).addLineSeries({
            color: '#ff9800',
            lineWidth: 2,
            lineType: 0,
            priceScaleId: 'rsi',
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01,
            },
          });
          
          // Add RSI reference lines (30 and 70)
          const rsiUpperLine = (chartRef.current as any).addLineSeries({
            color: 'rgba(255, 152, 0, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'rsi',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          const rsiLowerLine = (chartRef.current as any).addLineSeries({
            color: 'rgba(255, 152, 0, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'rsi',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          // Configure RSI scale
          chartRef.current?.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            borderColor: '#2a2e39',
          });
          
          rsiSeries.setData(rsiData.map(d => ({ time: d.time as any, value: d.value })));
          
          // Add reference lines data
          const referenceData = rsiData.map(d => ({ time: d.time as any, value: 70 }));
          const lowerReferenceData = rsiData.map(d => ({ time: d.time as any, value: 30 }));
          rsiUpperLine.setData(referenceData);
          rsiLowerLine.setData(lowerReferenceData);
          
          indicatorSeriesRef.current['RSI'] = rsiSeries;
          indicatorSeriesRef.current['RSI_Upper'] = rsiUpperLine;
          indicatorSeriesRef.current['RSI_Lower'] = rsiLowerLine;
          }
        } catch (error) {
          console.error('Error adding RSI indicator:', error);
        }
      }
      
      if (indicator === 'MACD') {
        try {
          const macdData = calculateMACD(data);
          if (macdData.length > 0 && macdData.every(d => 
            typeof d.macd === 'number' && !isNaN(d.macd) && 
            typeof d.signal === 'number' && !isNaN(d.signal) && 
            typeof d.histogram === 'number' && !isNaN(d.histogram)
          )) {
          // MACD Line
          const macdSeries = (chartRef.current as any).addLineSeries({
            color: '#2962ff',
            lineWidth: 2,
            lineType: 0,
            priceScaleId: 'macd',
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          
          // Signal Line
          const signalSeries = (chartRef.current as any).addLineSeries({
            color: '#ff6d00',
            lineWidth: 2,
            lineType: 0,
            priceScaleId: 'macd',
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          
          // Histogram
          const histogramSeries = (chartRef.current as any).addHistogramSeries({
            color: (data: any) => data.value >= 0 ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 82, 82, 0.6)',
            priceScaleId: 'macd',
            lastValueVisible: false,
          });
          
          // Zero line
          const zeroLine = (chartRef.current as any).addLineSeries({
            color: 'rgba(178, 181, 190, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'macd',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          // Configure MACD scale
          chartRef.current?.priceScale('macd').applyOptions({
            scaleMargins: { top: 0.6, bottom: 0 },
            borderColor: '#2a2e39',
          });
          
          macdSeries.setData(macdData.map(d => ({ time: d.time as any, value: d.macd })));
          signalSeries.setData(macdData.map(d => ({ time: d.time as any, value: d.signal })));
          histogramSeries.setData(macdData.map(d => ({ 
            time: d.time as any, 
            value: d.histogram,
            color: d.histogram >= 0 ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 82, 82, 0.6)'
          })));
          
          // Zero line data
          const zeroLineData = macdData.map(d => ({ time: d.time as any, value: 0 }));
          zeroLine.setData(zeroLineData);
          
          indicatorSeriesRef.current['MACD'] = macdSeries;
          indicatorSeriesRef.current['MACD_Signal'] = signalSeries;
          indicatorSeriesRef.current['MACD_Histogram'] = histogramSeries;
          indicatorSeriesRef.current['MACD_Zero'] = zeroLine;
          }
        } catch (error) {
          console.error('Error adding MACD indicator:', error);
        }
      }
      
      if (indicator === 'Bollinger') {
        try {
          const bollingerData = calculateBollingerBands(data);
          if (bollingerData.length > 0 && bollingerData.every(d => 
            typeof d.upper === 'number' && !isNaN(d.upper) && 
            typeof d.middle === 'number' && !isNaN(d.middle) && 
            typeof d.lower === 'number' && !isNaN(d.lower)
          )) {
          // Upper Band
          const upperBandSeries = (chartRef.current as any).addLineSeries({
            color: 'rgba(156, 39, 176, 0.8)',
            lineWidth: 1,
            lineStyle: 0,
            lineType: 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          // Middle Band (SMA)
          const middleBandSeries = (chartRef.current as any).addLineSeries({
            color: 'rgba(96, 125, 139, 0.9)',
            lineWidth: 2,
            lineStyle: 0,
            lineType: 0,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
          });
          
          // Lower Band
          const lowerBandSeries = (chartRef.current as any).addLineSeries({
            color: 'rgba(156, 39, 176, 0.8)',
            lineWidth: 1,
            lineStyle: 0,
            lineType: 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          // Fill area between bands
          const fillSeries = (chartRef.current as any).addAreaSeries({
            topColor: 'rgba(156, 39, 176, 0.1)',
            bottomColor: 'rgba(156, 39, 176, 0.05)',
            lineColor: 'rgba(156, 39, 176, 0.3)',
            lineWidth: 1,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          
          upperBandSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.upper })));
          middleBandSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.middle })));
          lowerBandSeries.setData(bollingerData.map(d => ({ time: d.time as any, value: d.lower })));
          
          // Create fill data for the area between bands
          const fillData = bollingerData.map(d => ({ time: d.time as any, value: d.upper }));
          fillSeries.setData(fillData);
          
          indicatorSeriesRef.current['Bollinger_Upper'] = upperBandSeries;
          indicatorSeriesRef.current['Bollinger_Middle'] = middleBandSeries;
          indicatorSeriesRef.current['Bollinger_Lower'] = lowerBandSeries;
          indicatorSeriesRef.current['Bollinger_Fill'] = fillSeries;
          }
        } catch (error) {
          console.error('Error adding Bollinger Bands indicator:', error);
        }
      }
    });
    } catch (error) {
      console.error('Error updating indicators:', error);
      // Clear indicator series on error to prevent chart from breaking
      indicatorSeriesRef.current = {};
    }
  }, [data, indicators]);

  // Handle candlestick pattern detection and visualization
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || data.length < 3 || !showPatterns) return;
    
    // Sort and deduplicate data by time to ensure proper ordering
    const uniqueData = data
      .sort((a, b) => a.time - b.time)
      .filter((candle, index, array) => 
        index === 0 || candle.time !== array[index - 1].time
      );
    
    // Only proceed if we have enough unique data points
    if (uniqueData.length < 3) return;
    
    // Detect patterns
    const allPatterns = detectAllPatterns(uniqueData);
    
    // Filter patterns based on selected patterns
    const filteredPatterns = allPatterns.filter(pattern => 
      selectedPatterns.includes(pattern.pattern)
    );
    
    if (filteredPatterns.length > 0) {
      // Create markers for each selected pattern
      const markers = filteredPatterns
        .map(pattern => {
          const candle = uniqueData.find(c => c.time === pattern.time);
          if (!candle) return null;
          
          return {
            time: pattern.time as any,
            position: pattern.type === 'bullish' ? 'belowBar' : 'aboveBar',
            color: pattern.type === 'bullish' ? '#089981' : '#f23645',
            shape: pattern.type === 'bullish' ? 'arrowUp' : 'arrowDown',
            size: 1,
            text: pattern.pattern,
          };
        })
        .filter(Boolean)
        .filter((marker): marker is NonNullable<typeof marker> => marker !== null);
      
      // Apply markers directly to the candlestick series
      if (markers.length > 0) {
        candlestickSeriesRef.current.setMarkers(markers);
      }
    } else {
      // Clear markers if no patterns are selected
      candlestickSeriesRef.current.setMarkers([]);
    }
  }, [data, showPatterns, selectedPatterns]);

  // Calculate date range for display
  const getDateRange = () => {
    if (data.length === 0) return '';
    
    const startDate = new Date(data[0].time * 1000);
    const endDate = new Date(data[data.length - 1].time * 1000);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  // Get recent patterns for display
  const getRecentPatterns = () => {
    if (!showPatterns || data.length < 3 || selectedPatterns.length === 0) return [];
    // Sort and deduplicate data by time to ensure proper ordering
    const uniqueData = data
      .sort((a, b) => a.time - b.time)
      .filter((candle, index, array) => 
        index === 0 || candle.time !== array[index - 1].time
      );
    
    if (uniqueData.length < 3) return [];
    
    const allPatterns = detectAllPatterns(uniqueData);
    const filteredPatterns = allPatterns.filter(pattern => 
      selectedPatterns.includes(pattern.pattern)
    );
    return filteredPatterns.slice(-5); // Last 5 selected patterns
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 320px)', display: 'flex', flexDirection: 'column' }}>
      <div 
        ref={chartContainerRef} 
        style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}
      />
      <div className="chart-info-panel">
        <h3>{symbol}</h3>
        
        <div className="info-row">
          <span className="info-label">Data Points</span>
          <span className="info-value">
            {data.length > 0 ? `${data.length.toLocaleString()}` : 'Loading...'}
          </span>
        </div>
        
        {data.length > 0 && (
          <>
            <div className="info-row">
              <span className="info-label">Period</span>
              <span className="info-value" style={{ fontSize: '11px' }}>
                {getDateRange()}
              </span>
            </div>
            
            <div className="info-row" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="info-label">Current Price</span>
              <span className="info-value" style={{
                fontSize: '16px',
                color: data.length > 1 && data[data.length - 1].close >= data[data.length - 2].close ? '#10B981' : '#EF4444',
                fontFamily: "'Playfair Display', serif"
              }}>
                ${data[data.length - 1].close.toLocaleString(undefined, {
                  minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
                  maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2
                })}
              </span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Last Update</span>
              <span className="info-value" style={{ fontSize: '11px' }}>
                {new Date(data[data.length - 1].time * 1000).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </span>
            </div>
            
            <div className="info-row" style={{ marginTop: '8px' }}>
              <span className="info-label">Chart Type</span>
              <span className="info-value" style={{ 
                fontSize: '11px',
                textTransform: 'capitalize',
                color: 'rgba(255,255,255,0.8)'
              }}>
                {chartType === 'heikin-ashi' ? 'Heikin Ashi' : chartType}
              </span>
            </div>
            
            {indicators.length > 0 && (
              <div className="info-row">
                <span className="info-label">Indicators</span>
                <span className="info-value" style={{ 
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.8)'
                }}>
                  {indicators.join(', ')}
                </span>
              </div>
            )}
            
            {showPatterns && getRecentPatterns().length > 0 && (
              <>
                <div className="info-row" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="info-label">Recent Patterns</span>
                </div>
                {getRecentPatterns().map((pattern, index) => (
                  <div key={index} className="info-row" style={{ marginTop: '4px' }}>
                    <span className="info-value" style={{ 
                      fontSize: '9px',
                      color: pattern.type === 'bullish' ? '#089981' : '#f23645',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{pattern.pattern}</span>
                      <span style={{ opacity: 0.7 }}>{pattern.confidence}%</span>
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      
      {/* Bottom data panel showing current candle information */}
      <div className="chart-bottom-data-panel">
        {currentData ? (
          <div className="bottom-data-content">
            <div className="data-section">
              <span className="data-label">Date:</span>
              <span className="data-value">
                {new Date(currentData.time * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  weekday: 'short'
                })}
              </span>
            </div>
            
            <div className="data-section">
              <span className="data-label">Time:</span>
              <span className="data-value">
                {new Date(currentData.time * 1000).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </span>
            </div>
            
            <div className="data-section">
              <span className="data-label">O:</span>
              <span className="data-value">
                ${currentData.open.toLocaleString(undefined, {
                  minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
                  maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2
                })}
              </span>
            </div>
            
            <div className="data-section">
              <span className="data-label">H:</span>
              <span className="data-value" style={{ color: '#089981' }}>
                ${currentData.high.toLocaleString(undefined, {
                  minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
                  maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2
                })}
              </span>
            </div>
            
            <div className="data-section">
              <span className="data-label">L:</span>
              <span className="data-value" style={{ color: '#f23645' }}>
                ${currentData.low.toLocaleString(undefined, {
                  minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
                  maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2
                })}
              </span>
            </div>
            
            <div className="data-section">
              <span className="data-label">C:</span>
              <span className="data-value" style={{
                color: currentData.close >= currentData.open ? '#089981' : '#f23645'
              }}>
                ${currentData.close.toLocaleString(undefined, {
                  minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
                  maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2
                })}
              </span>
            </div>
            
            {currentData.volume && (
              <div className="data-section">
                <span className="data-label">Vol:</span>
                <span className="data-value">
                  {(currentData.volume / 1000000).toFixed(2)}M
                </span>
              </div>
            )}
            
            <div className="data-section">
              <span className="data-label">Change:</span>
              <span className="data-value" style={{
                color: currentData.close >= currentData.open ? '#089981' : '#f23645'
              }}>
                {((currentData.close - currentData.open) / currentData.open * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        ) : (
          <div className="bottom-data-placeholder">
            <span>Hover over the chart to see candle data</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandlestickChart;