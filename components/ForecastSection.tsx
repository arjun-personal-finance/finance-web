'use client'

import { useState, useEffect } from 'react'
import {
  getForecastDashboard,
  getForecastSignal,
  getForecastFeatures,
  type ForecastDashboard,
  type ForecastSignal,
  type ForecastFeatures,
} from '@/lib/api'

// Signal descriptions for info tooltips
const SIGNAL_DESCRIPTIONS = {
  'Model Bias': `Shows the model's directional expectation for price over the next 1–2 weeks, based on COT positioning, price trends, volatility, and participation data available up to the latest Tuesday report.

Direction: The side (Bullish/Bearish) with higher predicted probability

Prob Up / Prob Down: Model-estimated likelihood of price moving up or down

Confidence: Strength of the probability edge (not a guarantee)

Horizon: Timeframe the prediction is trained for (weekly swing)

⚠️ This is a bias, not an entry signal. Use it to align trades, not to time them.`,

  'Regime': `Identifies the current market environment by analyzing how speculative (Managed Money) and hedger (Producer) positions interact.

Regime:

TRENDING → Strong alignment or divergence

CHOPPY → Mixed signals, low conviction

MM Z-Score: How extreme Managed Money positioning is versus its 3-year history

Divergence Z: Measures disagreement between Managed Money and Producers

Reason: Explains why the current regime was assigned

⚠️ Choppy regimes typically favor smaller positions or no trades.`,

  'MM Positioning': `Positioning: NET LONG or NET SHORT based on MM long % − short %

Z-Score: Measures how extreme current positioning is vs a 3-year average

Positive Z → More net long than usual (bullish crowding)

Negative Z → More net short than usual (bearish crowding)

Percentile: Where current positioning ranks historically (0–100)

Net %: Net MM exposure as a % of total open interest

📌 High |Z| values indicate crowded trades and potential reversals; values near zero suggest neutral positioning.`,

  'Producer Divergence': `Measures the positioning gap between Producers (hedgers) and Managed Money (speculators).

Level: Strength of the divergence based on historical Z-score

Z-Score: Standardized divergence vs 3-year average

Positive Z → Producers more long / less short than usual relative to MM

Negative Z → Producers more short relative to MM

Direction: Who is positioned opposite whom (e.g., Producers Long vs MM Short)

Change: Week-over-week change in divergence

📌 Elevated divergence often signals institutional hedging against current trends and can precede trend exhaustion or reversals, especially when MM positioning is crowded.`,

  'Price Context': `Describes the recent price trend and volatility regime based on weekly price behavior.

State: Overall price condition derived from short- and medium-term trends

4W Trend: % price change over the last 4 weeks (short-term momentum)

12W Trend: % price change over the last 12 weeks (medium-term trend strength)

Vol State: Volatility regime based on historical comparison

Vol Z: Z-score of recent volatility vs its long-term average

Positive Z → Higher than normal volatility

Negative Z → Lower than normal volatility

📌 Strong Rally + Elevated volatility suggests aggressive participation and momentum, but also higher risk of pullbacks or sharp swings.`,

  'Trade Readiness': `Summarizes whether current conditions are suitable for immediate execution or waiting.

Score (0–4): Number of key conditions aligned (trend, positioning, divergence, volatility)

Level:

WAIT (0–1) → No trade conditions

WATCH (2) → Partial alignment, monitor closely

READY (3) → Setup forming

EXECUTE (4) → High-conviction trade

Action: Suggested trader behavior based on the score

Factors: Key elements improving or reducing readiness

📌 A WATCH signal means directional bias exists, but risk conditions (e.g. high volatility) require patience and confirmation before entry.`,

  'Suggested Action': `Provides a practical trading recommendation by combining model bias, market regime, risk, and readiness.

Title: Overall directional signal derived from the model (Bullish / Bearish / Neutral)

Bias: Directional edge from the ML model probabilities

Regime: Current market structure (Trending, Choppy, Volatile)

Guidance: Execution advice based on regime and volatility

Risk Level: Estimated risk from volatility and positioning extremes

Readiness: Whether conditions support immediate entry or require monitoring

📌 A Bullish signal with Choppy regime and WATCH readiness suggests maintaining a bullish bias while waiting for cleaner price confirmation before entering.`
}

interface ForecastSectionProps {
  commodity: string
}

export default function ForecastSection({ commodity }: ForecastSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [forecastDashboard, setForecastDashboard] = useState<ForecastDashboard | null>(null)
  const [forecastSignal, setForecastSignal] = useState<ForecastSignal | null>(null)
  const [forecastFeatures, setForecastFeatures] = useState<ForecastFeatures | null>(null)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [isLoadingSignal, setIsLoadingSignal] = useState(false)
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [signalError, setSignalError] = useState<string | null>(null)
  const [featuresError, setFeaturesError] = useState<string | null>(null)
  const [activeInfo, setActiveInfo] = useState<string | null>(null)

  // Load forecast dashboard data
  useEffect(() => {
    if (!isExpanded) return

    const loadForecastDashboard = async () => {
      setIsLoadingDashboard(true)
      setDashboardError(null)

      try {
        const dashboardData = await getForecastDashboard(commodity)
        setForecastDashboard(dashboardData)
      } catch (err: any) {
        console.error('Error loading forecast dashboard:', err)
        setDashboardError(err.message)
      } finally {
        setIsLoadingDashboard(false)
      }
    }

    loadForecastDashboard()
  }, [commodity, isExpanded])

  // Load forecast signal data
  useEffect(() => {
    if (!isExpanded) return

    const loadForecastSignal = async () => {
      setIsLoadingSignal(true)
      setSignalError(null)

      try {
        const signalData = await getForecastSignal(commodity)
        setForecastSignal(signalData)
      } catch (err: any) {
        console.error('Error loading forecast signal:', err)
        setSignalError(err.message)
      } finally {
        setIsLoadingSignal(false)
      }
    }

    loadForecastSignal()
  }, [commodity, isExpanded])

  // Load forecast features data
  useEffect(() => {
    if (!isExpanded) return

    const loadForecastFeatures = async () => {
      setIsLoadingFeatures(true)
      setFeaturesError(null)

      try {
        const featuresData = await getForecastFeatures(commodity)
        setForecastFeatures(featuresData)
      } catch (err: any) {
        console.error('Error loading forecast features:', err)
        setFeaturesError(err.message)
      } finally {
        setIsLoadingFeatures(false)
      }
    }

    loadForecastFeatures()
  }, [commodity, isExpanded])

  return (
    <div className="bg-blue-50 p-4 rounded-md space-y-4">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer hover:bg-blue-100 p-2 rounded -mx-2 px-2"
      >
        <h3 className="font-semibold">Forecast</h3>
        <span className="text-gray-400 text-sm">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Dashboard */}
          {isLoadingDashboard && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Dashboard</h4>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Loading dashboard data...</p>
              </div>
            </div>
          )}

          {dashboardError && (
            <div className="bg-white p-4 rounded-md border border-red-200">
              <h4 className="font-semibold mb-3 text-red-800">Dashboard</h4>
              <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                Error loading dashboard: {dashboardError}
              </div>
            </div>
          )}

          {forecastDashboard && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Dashboard</h4>

              {/* Signals */}
              <div className="space-y-3 mb-4">
                <h5 className="text-sm font-medium text-gray-700">Signals</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Model Bias</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Model Bias' ? null : 'Model Bias')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Direction: <span className="font-medium">{forecastDashboard.signal_1_model_bias.direction}</span></div>
                      <div>Confidence: <span className="font-medium">{forecastDashboard.signal_1_model_bias.confidence}</span></div>
                      <div>Horizon: <span className="font-medium">{forecastDashboard.signal_1_model_bias.horizon}</span></div>
                      <div>Prob Up: <span className="font-medium">{(forecastDashboard.signal_1_model_bias.prob_up * 100).toFixed(1)}%</span></div>
                      <div>Prob Down: <span className="font-medium">{(forecastDashboard.signal_1_model_bias.prob_down * 100).toFixed(1)}%</span></div>
                    </div>
                    {activeInfo === 'Model Bias' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm">Model Bias</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Model Bias']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Regime</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Regime' ? null : 'Regime')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Regime: <span className="font-medium">{forecastDashboard.signal_2_regime.regime}</span></div>
                      <div>Reason: <span className="font-medium">{forecastDashboard.signal_2_regime.reason}</span></div>
                      <div>MM Z-Score: <span className="font-medium">{forecastDashboard.signal_2_regime.mm_z.toFixed(2)}</span></div>
                      <div>Divergence Z: <span className="font-medium">{forecastDashboard.signal_2_regime.divergence_z.toFixed(2)}</span></div>
                    </div>
                    {activeInfo === 'Regime' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">Regime</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Regime']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">MM Positioning</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'MM Positioning' ? null : 'MM Positioning')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Positioning: <span className="font-medium">{forecastDashboard.signal_3_mm_gauge.positioning}</span></div>
                      <div>Z-Score: <span className="font-medium">{forecastDashboard.signal_3_mm_gauge.z_score.toFixed(2)}</span></div>
                      <div>Percentile: <span className="font-medium">{forecastDashboard.signal_3_mm_gauge.percentile}</span></div>
                      <div>Net %: <span className="font-medium">{(forecastDashboard.signal_3_mm_gauge.net_pct * 100).toFixed(1)}%</span></div>
                    </div>
                    {activeInfo === 'MM Positioning' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">MM Positioning</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['MM Positioning']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Producer Divergence</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Producer Divergence' ? null : 'Producer Divergence')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Level: <span className="font-medium">{forecastDashboard.signal_4_producer_divergence.level}</span></div>
                      <div>Z-Score: <span className="font-medium">{forecastDashboard.signal_4_producer_divergence.z_score.toFixed(2)}</span></div>
                      <div>Direction: <span className="font-medium">{forecastDashboard.signal_4_producer_divergence.direction}</span></div>
                      <div>Change: <span className="font-medium">{forecastDashboard.signal_4_producer_divergence.divergence_change.toFixed(4)}</span></div>
                    </div>
                    {activeInfo === 'Producer Divergence' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">Producer Divergence</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Producer Divergence']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Price Context</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Price Context' ? null : 'Price Context')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>State: <span className="font-medium">{forecastDashboard.signal_5_price_context.price_state}</span></div>
                      <div>4W Trend: <span className="font-medium">{forecastDashboard.signal_5_price_context.trend_4w.toFixed(2)}</span></div>
                      <div>12W Trend: <span className="font-medium">{forecastDashboard.signal_5_price_context.trend_12w.toFixed(2)}</span></div>
                      <div>Vol State: <span className="font-medium">{forecastDashboard.signal_5_price_context.vol_state}</span></div>
                      <div>Vol Z: <span className="font-medium">{forecastDashboard.signal_5_price_context.vol_z.toFixed(2)}</span></div>
                    </div>
                    {activeInfo === 'Price Context' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">Price Context</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Price Context']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Trade Readiness</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Trade Readiness' ? null : 'Trade Readiness')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Score: <span className="font-medium">{forecastDashboard.signal_6_trade_readiness.score}/{forecastDashboard.signal_6_trade_readiness.max_score}</span></div>
                      <div>Level: <span className="font-medium">{forecastDashboard.signal_6_trade_readiness.level}</span></div>
                      <div>Action: <span className="font-medium">{forecastDashboard.signal_6_trade_readiness.action}</span></div>
                      <div>Factors: <span className="font-medium">{forecastDashboard.signal_6_trade_readiness.factors.join(', ')}</span></div>
                    </div>
                    {activeInfo === 'Trade Readiness' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">Trade Readiness</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Trade Readiness']}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-3 rounded col-span-1 md:col-span-2 relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-600">Suggested Action</div>
                      <button
                        onClick={() => setActiveInfo(activeInfo === 'Suggested Action' ? null : 'Suggested Action')}
                        className="text-gray-500 hover:text-gray-700 text-sm cursor-pointer"
                        title="Click for info"
                      >
                        ℹ️
                      </button>
                    </div>
                    <div className="space-y-1 text-sm md:text-base">
                      <div>Title: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.title}</span></div>
                      <div>Bias: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.bias}</span></div>
                      <div>Regime: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.regime}</span></div>
                      <div>Guidance: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.guidance}</span></div>
                      <div>Risk Level: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.risk_level}</span></div>
                      <div>Readiness: <span className="font-medium">{forecastDashboard.signal_7_suggested_action.readiness}</span></div>
                    </div>
                    {activeInfo === 'Suggested Action' && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg p-3 z-10">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm md:text-base">Suggested Action</h4>
                          <button
                            onClick={() => setActiveInfo(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        <div className="text-xs md:text-sm text-gray-700 whitespace-pre-line">
                          {SIGNAL_DESCRIPTIONS['Suggested Action']}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Summary */}
              <div className="border-t border-blue-200 pt-3 mb-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Quick Summary</h5>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div>Direction: <span className="font-medium">{forecastDashboard.quick_summary.direction}</span></div>
                  <div>Confidence: <span className="font-medium">{forecastDashboard.quick_summary.confidence}</span></div>
                  <div>Regime: <span className="font-medium">{forecastDashboard.quick_summary.regime}</span></div>
                  <div>Trade Readiness: <span className="font-medium">{forecastDashboard.quick_summary.trade_readiness}</span></div>
                  <div>Action: <span className="font-medium">{forecastDashboard.quick_summary.action}</span></div>
                </div>
              </div>

              {/* Prediction */}
              <div className="border-t border-blue-200 pt-3 mb-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Prediction</h5>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div>Direction: <span className="font-medium">{forecastDashboard.prediction.direction}</span></div>
                  <div className="mt-2">
                    <div>Up Probability: <span className="font-medium">{(forecastDashboard.prediction.probabilities.up * 100).toFixed(1)}%</span></div>
                    <div>Down Probability: <span className="font-medium">{(forecastDashboard.prediction.probabilities.down * 100).toFixed(1)}%</span></div>
                  </div>
                </div>
              </div>

              {/* Data Info */}
              <div className="border-t border-blue-200 pt-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Data Info</h5>
                <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                  <div>Generated At: <span className="font-medium">{new Date(forecastDashboard.generated_at).toLocaleString()}</span></div>
                  <div>COT Report Date: <span className="font-medium">{forecastDashboard.data_info.cot_report_date}</span></div>
                  <div>Price Date: <span className="font-medium">{forecastDashboard.data_info.price_date}</span></div>
                  <div>Commodity: <span className="font-medium">{forecastDashboard.data_info.commodity}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Signal */}
          {isLoadingSignal && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Signal</h4>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Loading signal data...</p>
              </div>
            </div>
          )}

          {signalError && (
            <div className="bg-white p-4 rounded-md border border-red-200">
              <h4 className="font-semibold mb-3 text-red-800">Signal</h4>
              <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                Error loading signal: {signalError}
              </div>
            </div>
          )}

          {forecastSignal && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Signal</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Direction</div>
                  <div className="font-medium">{forecastSignal.direction}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Confidence</div>
                  <div className="font-medium">{forecastSignal.confidence}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Regime</div>
                  <div className="font-medium">{forecastSignal.regime}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Trade Readiness</div>
                  <div className="font-medium">{forecastSignal.trade_readiness}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded col-span-2">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Action</div>
                  <div className="font-medium">{forecastSignal.action}</div>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          {isLoadingFeatures && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Features</h4>
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Loading features data...</p>
              </div>
            </div>
          )}

          {featuresError && (
            <div className="bg-white p-4 rounded-md border border-red-200">
              <h4 className="font-semibold mb-3 text-red-800">Features</h4>
              <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                Error loading features: {featuresError}
              </div>
            </div>
          )}

          {forecastFeatures && (
            <div className="bg-white p-4 rounded-md border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Features</h4>

              {/* Features Table */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Features</h5>
                <div className="bg-gray-50 p-3 rounded max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(forecastFeatures.features).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interpretations */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Interpretations</h5>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Model</div>
                    <div className="text-sm space-y-1">
                      <div>Probability Up: <span className="font-medium">{(forecastFeatures.interpretations.model_probability_up * 100).toFixed(1)}%</span></div>
                      <div>Trade Signal: <span className="font-medium">{forecastFeatures.interpretations.trade_signal}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Regime</div>
                    <div className="text-sm space-y-1">
                      <div>Trend: <span className="font-medium">{forecastFeatures.interpretations.regime.trend}</span></div>
                      <div>Volatility: <span className="font-medium">{forecastFeatures.interpretations.regime.volatility}</span></div>
                      <div>Participation: <span className="font-medium">{forecastFeatures.interpretations.regime.participation}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Managed Money</div>
                    <div className="text-sm space-y-1">
                      <div>Direction: <span className="font-medium">{forecastFeatures.interpretations.managed_money.direction}</span></div>
                      <div>Crowding: <span className="font-medium">{forecastFeatures.interpretations.managed_money.crowding}</span></div>
                      <div>Momentum: <span className="font-medium">{forecastFeatures.interpretations.managed_money.momentum}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Producer</div>
                    <div className="text-sm space-y-1">
                      <div>Positioning: <span className="font-medium">{forecastFeatures.interpretations.producer.positioning}</span></div>
                      <div>Stress: <span className="font-medium">{forecastFeatures.interpretations.producer.stress}</span></div>
                      <div>Momentum: <span className="font-medium">{forecastFeatures.interpretations.producer.momentum}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Divergence</div>
                    <div className="text-sm space-y-1">
                      <div>Level: <span className="font-medium">{forecastFeatures.interpretations.divergence.level}</span></div>
                      <div>Direction: <span className="font-medium">{forecastFeatures.interpretations.divergence.direction}</span></div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Execution</div>
                    <div className="text-sm space-y-1">
                      <div>Bias: <span className="font-medium">{forecastFeatures.interpretations.execution.bias}</span></div>
                      <div>Action: <span className="font-medium">{forecastFeatures.interpretations.execution.action}</span></div>
                      <div>Position Size: <span className="font-medium">{forecastFeatures.interpretations.execution.position_size_multiplier}x</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Narrative */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Narrative</h5>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {forecastFeatures.interpretations.narrative}
                </div>
              </div>

              {/* Model Prediction */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Model Prediction</h5>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div>Direction: <span className="font-medium">{forecastFeatures.model_prediction.direction}</span></div>
                  <div className="mt-2">
                    <div>Up Probability: <span className="font-medium">{(forecastFeatures.model_prediction.probabilities.up * 100).toFixed(1)}%</span></div>
                    <div>Down Probability: <span className="font-medium">{(forecastFeatures.model_prediction.probabilities.down * 100).toFixed(1)}%</span></div>
                  </div>
                </div>
              </div>

              {/* Report Date */}
              <div className="border-t border-blue-200 pt-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Report Date</h5>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {forecastFeatures.report_date}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}