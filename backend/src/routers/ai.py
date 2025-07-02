"""
AI-Powered Analytics Endpoints
----------------------------
Provides AI-powered analysis endpoints for enhanced performance insights.
Implements robust multi-provider AI API key failover logic:
1. OpenRouter (primary)
2. Google Gemini (secondary)  
3. A4F.co (tertiary)

Uses the API key management system to securely access AI services.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
import httpx
import json
import logging
from datetime import datetime
from enum import Enum

from ..database import get_db
from ..database.models import User, APIKey, APIKeyType, UserTopicSummary, UserOverallSummary, TestAttempt
from ..auth.auth import verify_token

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["AI Analytics"]
)

# --- Constants and Configuration ---

class AIProviderStatus(Enum):
    """Status of AI provider attempts"""
    SUCCESS = "success"
    FAILED = "failed"
    NOT_AVAILABLE = "not_available"

# Provider configurations
PROVIDER_CONFIGS = {
    APIKeyType.OPENROUTER: {
        "name": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "default_model": "openai/gpt-4.1"
    },
    APIKeyType.GOOGLE: {
        "name": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        "default_model": "gemini-2.5-flash"
    },
    APIKeyType.A4F: {
        "name": "A4F.co",
        "base_url": "https://api.a4f.co/v1/chat/completions", 
        "default_model": "provider-5/gemini-2.5-flash-preview-04-17"
    }
}

# Failover order as requested: OpenRouter → Google → A4F
PROVIDER_FAILOVER_ORDER = [APIKeyType.OPENROUTER, APIKeyType.GOOGLE, APIKeyType.A4F]

# --- Pydantic Models ---

class PerformanceDataPoint(BaseModel):
    date: str
    score: float
    topic: Optional[str] = None
    difficulty: Optional[int] = None
    timeSpent: Optional[float] = None
    questionCount: Optional[int] = None

class AITrendInsight(BaseModel):
    type: str = Field(..., description="Type of insight: trend, insight, or recommendation")
    title: str
    content: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level 0-1")
    timestamp: str
    data: Optional[Dict[str, Any]] = None

class TrendAnalysisRequest(BaseModel):
    timeframe: str = Field(..., pattern="^(week|month|quarter|year)$")
    analysisType: str = Field(..., pattern="^(overall|topic|difficulty|time)$")
    performanceData: Optional[List[PerformanceDataPoint]] = None

class TrendAnalysisResponse(BaseModel):
    insights: List[AITrendInsight]
    trendData: List[PerformanceDataPoint]
    predictions: Optional[List[PerformanceDataPoint]] = None
    recommendations: List[str]
    
class PerformanceInsightsRequest(BaseModel):
    focusAreas: Optional[List[str]] = None
    includeStrengths: bool = True
    includeWeaknesses: bool = True

class PerformanceInsightsResponse(BaseModel):
    insights: List[AITrendInsight]
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]

class QuestionRecommendationsRequest(BaseModel):
    maxRecommendations: int = Field(5, ge=1, le=20)
    difficulty: Optional[str] = None
    topics: Optional[List[str]] = None

class QuestionRecommendationsResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    reasoning: List[str]
    studyPlan: Optional[List[str]] = None

class WeaknessHeatmapRequest(BaseModel):
    granularity: str = Field("topic", pattern="^(topic|subtopic|question)$")
    includeTime: bool = True

class WeaknessHeatmapResponse(BaseModel):
    heatmapData: List[Dict[str, Any]]
    insights: List[AITrendInsight]
    recommendations: List[str]

class StudyPlanRequest(BaseModel):
    timeAvailable: int = Field(..., ge=1, le=40, description="Hours per week")
    targetDuration: int = Field(..., ge=1, le=52, description="Weeks")
    goals: Optional[List[str]] = None
    weakTopics: Optional[List[str]] = None

class StudyPlanResponse(BaseModel):
    plan: List[Dict[str, Any]]
    milestones: List[Dict[str, Any]]
    recommendations: List[str]
    estimatedOutcome: Optional[str] = None

class MotivationBoostRequest(BaseModel):
    recentActivity: Optional[Dict[str, Any]] = None
    mood: Optional[str] = None

class MotivationBoostResponse(BaseModel):
    motivationalMessage: str
    achievements: List[str]
    nextGoals: List[str]
    encouragement: List[str]

# --- Helper Functions ---

async def get_ai_api_key(db: Session, key_type: APIKeyType) -> Optional[str]:
    """Get and decrypt an AI API key from the database."""
    try:
        api_key_record = db.query(APIKey).filter(
            APIKey.key_type == key_type
        ).first()
        
        if not api_key_record:
            logger.warning(f"No API key found for provider: {key_type.value}")
            return None
            
        # The EncryptedField automatically decrypts the data when accessed
        decrypted_key = api_key_record.encrypted_key
        logger.info(f"Successfully retrieved API key for provider: {key_type.value}")
        return decrypted_key
    except Exception as e:
        logger.error(f"Failed to retrieve {key_type.value} API key: {e}")
        return None

async def call_openrouter_ai(api_key: str, prompt: str, model: str = None) -> Tuple[str, AIProviderStatus]:
    """Call OpenRouter AI API with proper error handling."""
    try:
        model = model or PROVIDER_CONFIGS[APIKeyType.OPENROUTER]["default_model"]
        url = PROVIDER_CONFIGS[APIKeyType.OPENROUTER]["base_url"]
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        data = {
            "model": model,
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result.get("choices") and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                logger.info(f"OpenRouter API call successful, response length: {len(content)}")
                return content, AIProviderStatus.SUCCESS
            else:
                logger.warning("OpenRouter API returned empty response")
                return "", AIProviderStatus.FAILED
                
    except httpx.TimeoutException:
        logger.warning("OpenRouter API call timed out")
        return "", AIProviderStatus.FAILED
    except httpx.HTTPStatusError as e:
        logger.warning(f"OpenRouter API HTTP error {e.response.status_code}: {e.response.text}")
        return "", AIProviderStatus.FAILED
    except Exception as e:
        logger.error(f"OpenRouter API call failed: {e}")
        return "", AIProviderStatus.FAILED

async def call_google_ai(api_key: str, prompt: str) -> Tuple[str, AIProviderStatus]:
    """Call Google Gemini AI API with proper error handling."""
    try:
        url = f"{PROVIDER_CONFIGS[APIKeyType.GOOGLE]['base_url']}?key={api_key}"
        headers = {
            "Content-Type": "application/json",
        }
        
        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result.get("candidates") and len(result["candidates"]) > 0:
                content = result["candidates"][0].get("content", {})
                parts = content.get("parts", [])
                if parts and len(parts) > 0:
                    text_content = parts[0].get("text", "")
                    logger.info(f"Google Gemini API call successful, response length: {len(text_content)}")
                    return text_content, AIProviderStatus.SUCCESS
                    
            logger.warning("Google Gemini API returned empty response")
            return "", AIProviderStatus.FAILED
            
    except httpx.TimeoutException:
        logger.warning("Google Gemini API call timed out")
        return "", AIProviderStatus.FAILED
    except httpx.HTTPStatusError as e:
        logger.warning(f"Google Gemini API HTTP error {e.response.status_code}: {e.response.text}")
        return "", AIProviderStatus.FAILED
    except Exception as e:
        logger.error(f"Google Gemini API call failed: {e}")
        return "", AIProviderStatus.FAILED

async def call_a4f_ai(api_key: str, prompt: str, model: str = None) -> Tuple[str, AIProviderStatus]:
    """Call A4F.co AI API with proper error handling."""
    try:
        model = model or PROVIDER_CONFIGS[APIKeyType.A4F]["default_model"]
        url = PROVIDER_CONFIGS[APIKeyType.A4F]["base_url"]
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        data = {
            "model": model,
            "messages": [{
                "role": "user", 
                "content": prompt
            }],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result.get("choices") and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                logger.info(f"A4F API call successful, response length: {len(content)}")
                return content, AIProviderStatus.SUCCESS
            else:
                logger.warning("A4F API returned empty response")
                return "", AIProviderStatus.FAILED
                
    except httpx.TimeoutException:
        logger.warning("A4F API call timed out")
        return "", AIProviderStatus.FAILED
    except httpx.HTTPStatusError as e:
        logger.warning(f"A4F API HTTP error {e.response.status_code}: {e.response.text}")
        return "", AIProviderStatus.FAILED
    except Exception as e:
        logger.error(f"A4F API call failed: {e}")
        return "", AIProviderStatus.FAILED

async def generate_ai_response(db: Session, prompt: str) -> str:
    """
    Generate AI response using multi-provider failover system.
    
    Tries providers in order: OpenRouter → Google → A4F
    Returns response from first successful provider.
    """
    attempted_providers = []
    
    for provider_type in PROVIDER_FAILOVER_ORDER:
        provider_name = PROVIDER_CONFIGS[provider_type]["name"]
        attempted_providers.append(provider_name)
        
        # Get API key for this provider
        api_key = await get_ai_api_key(db, provider_type)
        if not api_key:
            logger.info(f"Skipping {provider_name}: No API key configured")
            continue
            
        logger.info(f"Attempting AI request with {provider_name}")
        
        # Call the appropriate provider
        try:
            if provider_type == APIKeyType.OPENROUTER:
                response, status = await call_openrouter_ai(api_key, prompt)
            elif provider_type == APIKeyType.GOOGLE:
                response, status = await call_google_ai(api_key, prompt)
            elif provider_type == APIKeyType.A4F:
                response, status = await call_a4f_ai(api_key, prompt)
            else:
                logger.warning(f"Unknown provider type: {provider_type}")
                continue
                
            # If successful, return the response
            if status == AIProviderStatus.SUCCESS and response.strip():
                logger.info(f"Successfully got AI response from {provider_name}")
                return response
            else:
                logger.warning(f"{provider_name} failed or returned empty response")
                
        except Exception as e:
            logger.error(f"Unexpected error with {provider_name}: {e}")
            continue
    
    # If we get here, all providers failed
    error_msg = f"All AI providers failed. Attempted: {', '.join(attempted_providers)}"
    logger.error(error_msg)
    raise HTTPException(
        status_code=503,
        detail="AI services are currently unavailable. Please ensure API keys are configured and try again later."
    )

async def get_user_performance_data(db: Session, user_id: int) -> List[PerformanceDataPoint]:
    """Get user's performance data for AI analysis."""
    try:
        # Get overall summary
        overall = db.query(UserOverallSummary).filter(
            UserOverallSummary.user_id == user_id
        ).first()
        
        # Get topic summaries
        topics = db.query(UserTopicSummary).filter(
            UserTopicSummary.user_id == user_id
        ).all()
        
        # Get recent test attempts
        attempts = db.query(TestAttempt).filter(
            TestAttempt.user_id == user_id,
            TestAttempt.status == "Completed"
        ).order_by(TestAttempt.end_time.desc()).limit(20).all()
        
        performance_data = []
        
        # Add overall performance point
        if overall:
            performance_data.append(PerformanceDataPoint(
                date=datetime.now().isoformat(),
                score=overall.accuracy_percentage_overall or 0,
                topic="Overall",
                difficulty=5,
                timeSpent=overall.avg_time_per_question_overall or 0,
                questionCount=overall.total_questions_answered_overall or 0
            ))
        
        # Add topic performance points
        for topic in topics:
            # Calculate average accuracy across difficulties
            accuracies = []
            if topic.accuracy_easy_topic is not None:
                accuracies.append(topic.accuracy_easy_topic)
            if topic.accuracy_medium_topic is not None:
                accuracies.append(topic.accuracy_medium_topic)
            if topic.accuracy_hard_topic is not None:
                accuracies.append(topic.accuracy_hard_topic)
            
            avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
            
            performance_data.append(PerformanceDataPoint(
                date=datetime.now().isoformat(),
                score=avg_accuracy,
                topic=f"Paper {topic.paper_id}" + (f" Section {topic.section_id}" if topic.section_id else ""),
                difficulty=5,
                timeSpent=topic.avg_time_per_question_topic or 0,
                questionCount=topic.total_questions_answered_in_topic or 0
            ))
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Failed to get performance data for user {user_id}: {e}")
        return []

# --- API Endpoints ---

@router.post("/analyze-trends", response_model=TrendAnalysisResponse)
async def analyze_trends(
    request: TrendAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Analyze performance trends using AI to provide insights and predictions.
    """
    try:
        logger.info(f"Analyzing trends for user {current_user.email} (ID: {current_user.user_id})")
        
        # Get user performance data if not provided
        performance_data = request.performanceData
        if not performance_data:
            performance_data = await get_user_performance_data(db, current_user.user_id)
        
        if not performance_data:
            raise HTTPException(
                status_code=404,
                detail="No performance data available for analysis. Complete some tests first."
            )
        
        # Create AI prompt for trend analysis
        prompt = f"""
        Analyze the following performance data for educational insights:
        
        User Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Analysis Parameters:
        - Timeframe: {request.timeframe}
        - Analysis Type: {request.analysisType}
        
        Please provide:
        1. Key trends and patterns observed
        2. Specific insights about performance changes
        3. Predictions for future performance
        4. Actionable recommendations for improvement
        
        Respond in JSON format with the following structure:
        {{
            "insights": [
                {{
                    "type": "trend|insight|recommendation",
                    "title": "Brief title",
                    "content": "Detailed explanation",
                    "confidence": 0.8
                }}
            ],
            "predictions": [
                {{
                    "date": "future_date",
                    "score": predicted_score,
                    "reasoning": "why this prediction"
                }}
            ],
            "recommendations": ["specific actionable advice"]
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            # Parse AI response
            parsed_response = json.loads(ai_response)
            
            # Convert to response format
            insights = []
            for insight in parsed_response.get("insights", []):
                insights.append(AITrendInsight(
                    type=insight.get("type", "insight"),
                    title=insight.get("title", "AI Insight"),
                    content=insight.get("content", ""),
                    confidence=insight.get("confidence", 0.7),
                    timestamp=datetime.now().isoformat()
                ))
            
            predictions = []
            for pred in parsed_response.get("predictions", []):
                predictions.append(PerformanceDataPoint(
                    date=pred.get("date", datetime.now().isoformat()),
                    score=pred.get("score", 0),
                    topic="Prediction",
                    difficulty=5
                ))
            
            return TrendAnalysisResponse(
                insights=insights,
                trendData=performance_data,
                predictions=predictions,
                recommendations=parsed_response.get("recommendations", [])
            )
            
        except json.JSONDecodeError:
            # Fallback if AI doesn't return valid JSON
            return TrendAnalysisResponse(
                insights=[
                    AITrendInsight(
                        type="insight",
                        title="AI Analysis Complete",
                        content=ai_response[:500] + "..." if len(ai_response) > 500 else ai_response,
                        confidence=0.7,
                        timestamp=datetime.now().isoformat()
                    )
                ],
                trendData=performance_data,
                recommendations=["Continue practicing regularly", "Focus on weaker topic areas"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend analysis failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze trends. Please try again later."
        )

@router.post("/performance-insights", response_model=PerformanceInsightsResponse)
async def get_performance_insights(
    request: PerformanceInsightsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Generate AI-powered insights about user's performance strengths and weaknesses.
    """
    try:
        logger.info(f"Generating performance insights for user {current_user.email}")
        
        performance_data = await get_user_performance_data(db, current_user.user_id)
        
        if not performance_data:
            raise HTTPException(
                status_code=404,
                detail="No performance data available for analysis. Complete some tests first."
            )
        
        prompt = f"""
        Analyze the following educational performance data to provide insights:
        
        Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Focus Areas: {request.focusAreas or "All areas"}
        Include Strengths: {request.includeStrengths}
        Include Weaknesses: {request.includeWeaknesses}
        
        Please identify:
        1. Key strengths in performance
        2. Areas needing improvement
        3. Specific actionable insights
        4. Personalized recommendations
        
        Respond in JSON format:
        {{
            "insights": [
                {{
                    "type": "insight",
                    "title": "Brief title",
                    "content": "Detailed analysis",
                    "confidence": 0.8
                }}
            ],
            "strengths": ["list of strength areas"],
            "weaknesses": ["list of improvement areas"],
            "recommendations": ["specific actions to take"]
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            parsed_response = json.loads(ai_response)
            
            insights = []
            for insight in parsed_response.get("insights", []):
                insights.append(AITrendInsight(
                    type=insight.get("type", "insight"),
                    title=insight.get("title", "Performance Insight"),
                    content=insight.get("content", ""),
                    confidence=insight.get("confidence", 0.7),
                    timestamp=datetime.now().isoformat()
                ))
            
            return PerformanceInsightsResponse(
                insights=insights,
                strengths=parsed_response.get("strengths", []),
                weaknesses=parsed_response.get("weaknesses", []),
                recommendations=parsed_response.get("recommendations", [])
            )
            
        except json.JSONDecodeError:
            # Fallback response
            return PerformanceInsightsResponse(
                insights=[
                    AITrendInsight(
                        type="insight",
                        title="Performance Analysis",
                        content=ai_response[:500] + "..." if len(ai_response) > 500 else ai_response,
                        confidence=0.7,
                        timestamp=datetime.now().isoformat()
                    )
                ],
                strengths=["Shows consistent effort"],
                weaknesses=["Could benefit from focused practice"],
                recommendations=["Continue regular practice", "Focus on challenging topics"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Performance insights failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate performance insights. Please try again later."
        )

@router.post("/question-recommendations", response_model=QuestionRecommendationsResponse)
async def get_question_recommendations(
    request: QuestionRecommendationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Get AI-powered question recommendations based on user performance.
    """
    try:
        logger.info(f"Generating question recommendations for user {current_user.email}")
        
        performance_data = await get_user_performance_data(db, current_user.user_id)
        
        prompt = f"""
        Based on the following performance data, recommend specific questions and study focus:
        
        Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Preferences:
        - Max Recommendations: {request.maxRecommendations}
        - Difficulty: {request.difficulty or "Adaptive"}
        - Topics: {request.topics or "All available"}
        
        Please provide:
        1. Specific question recommendations with rationale
        2. Reasoning for each recommendation
        3. A suggested study plan sequence
        
        Respond in JSON format:
        {{
            "recommendations": [
                {{
                    "topic": "Topic name",
                    "difficulty": "Easy/Medium/Hard",
                    "reason": "Why this is recommended",
                    "priority": 1-10,
                    "estimatedTime": "Expected time to complete"
                }}
            ],
            "reasoning": ["explanations for recommendation logic"],
            "studyPlan": ["ordered sequence of study steps"]
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            parsed_response = json.loads(ai_response)
            
            return QuestionRecommendationsResponse(
                recommendations=parsed_response.get("recommendations", []),
                reasoning=parsed_response.get("reasoning", []),
                studyPlan=parsed_response.get("studyPlan", [])
            )
            
        except json.JSONDecodeError:
            # Fallback recommendations
            return QuestionRecommendationsResponse(
                recommendations=[
                    {
                        "topic": "Mixed Practice",
                        "difficulty": "Medium",
                        "reason": "Balanced practice across all areas",
                        "priority": 5,
                        "estimatedTime": "30 minutes"
                    }
                ],
                reasoning=["AI analysis suggests mixed practice would be beneficial"],
                studyPlan=["Start with weaker topics", "Progress to stronger areas", "Regular review sessions"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Question recommendations failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate question recommendations. Please try again later."
        )

@router.post("/weakness-heatmap", response_model=WeaknessHeatmapResponse)
async def get_weakness_heatmap(
    request: WeaknessHeatmapRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Generate AI-powered weakness heatmap visualization data.
    """
    try:
        logger.info(f"Generating weakness heatmap for user {current_user.email}")
        
        performance_data = await get_user_performance_data(db, current_user.user_id)
        
        if not performance_data:
            raise HTTPException(
                status_code=404,
                detail="No performance data available for heatmap. Complete some tests first."
            )
        
        prompt = f"""
        Create a weakness heatmap analysis based on the following performance data:
        
        Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Parameters:
        - Granularity: {request.granularity}
        - Include Time Analysis: {request.includeTime}
        
        Please provide:
        1. Heatmap data with weakness intensity scores
        2. Insights about weakness patterns
        3. Targeted recommendations for improvement
        
        Respond in JSON format:
        {{
            "heatmapData": [
                {{
                    "topic": "topic name",
                    "weakness_score": 0.0-1.0,
                    "area": "specific area",
                    "frequency": number_of_attempts,
                    "avg_accuracy": percentage,
                    "time_efficiency": "poor/fair/good"
                }}
            ],
            "insights": [
                {{
                    "type": "insight",
                    "title": "Pattern found",
                    "content": "detailed analysis",
                    "confidence": 0.8
                }}
            ],
            "recommendations": ["specific improvement actions"]
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            parsed_response = json.loads(ai_response)
            
            insights = []
            for insight in parsed_response.get("insights", []):
                insights.append(AITrendInsight(
                    type=insight.get("type", "insight"),
                    title=insight.get("title", "Weakness Pattern"),
                    content=insight.get("content", ""),
                    confidence=insight.get("confidence", 0.7),
                    timestamp=datetime.now().isoformat()
                ))
            
            return WeaknessHeatmapResponse(
                heatmapData=parsed_response.get("heatmapData", []),
                insights=insights,
                recommendations=parsed_response.get("recommendations", [])
            )
            
        except json.JSONDecodeError:
            # Fallback heatmap data
            fallback_data = []
            for data_point in performance_data:
                if data_point.topic and data_point.topic != "Overall":
                    weakness_score = max(0, 1.0 - (data_point.score / 100))
                    fallback_data.append({
                        "topic": data_point.topic,
                        "weakness_score": weakness_score,
                        "area": data_point.topic,
                        "frequency": 1,
                        "avg_accuracy": data_point.score,
                        "time_efficiency": "fair"
                    })
            
            return WeaknessHeatmapResponse(
                heatmapData=fallback_data,
                insights=[
                    AITrendInsight(
                        type="insight",
                        title="Weakness Analysis",
                        content="Analysis completed based on available performance data",
                        confidence=0.6,
                        timestamp=datetime.now().isoformat()
                    )
                ],
                recommendations=["Focus on areas with lower accuracy", "Practice time management"]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Weakness heatmap failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate weakness heatmap. Please try again later."
        )

@router.post("/study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(
    request: StudyPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Generate AI-powered personalized study plan.
    """
    try:
        logger.info(f"Generating study plan for user {current_user.email}")
        
        performance_data = await get_user_performance_data(db, current_user.user_id)
        
        prompt = f"""
        Create a personalized study plan based on the following information:
        
        Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Study Parameters:
        - Time Available: {request.timeAvailable} hours per week
        - Target Duration: {request.targetDuration} weeks
        - Goals: {request.goals or "General improvement"}
        - Weak Topics: {request.weakTopics or "Identified from data"}
        
        Please provide:
        1. Detailed weekly study plan
        2. Key milestones and checkpoints
        3. Specific recommendations for each phase
        4. Estimated learning outcomes
        
        Respond in JSON format:
        {{
            "plan": [
                {{
                    "week": 1,
                    "focus": "Topic/skill focus",
                    "tasks": ["specific tasks for the week"],
                    "timeAllocation": {{"topic1": hours, "topic2": hours}},
                    "goals": ["weekly objectives"]
                }}
            ],
            "milestones": [
                {{
                    "week": milestone_week,
                    "description": "milestone description",
                    "assessment": "how to measure progress",
                    "criteria": "success criteria"
                }}
            ],
            "recommendations": ["overall study recommendations"],
            "estimatedOutcome": "expected improvement description"
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            parsed_response = json.loads(ai_response)
            
            return StudyPlanResponse(
                plan=parsed_response.get("plan", []),
                milestones=parsed_response.get("milestones", []),
                recommendations=parsed_response.get("recommendations", []),
                estimatedOutcome=parsed_response.get("estimatedOutcome")
            )
            
        except json.JSONDecodeError:
            # Fallback study plan
            weeks = min(request.targetDuration, 12)  # Cap at 12 weeks for fallback
            plan = []
            for week in range(1, weeks + 1):
                plan.append({
                    "week": week,
                    "focus": f"Mixed practice - Week {week}",
                    "tasks": ["Review previous materials", "Practice new questions", "Take mock tests"],
                    "timeAllocation": {"study": request.timeAvailable * 0.7, "practice": request.timeAvailable * 0.3},
                    "goals": [f"Complete Week {week} objectives"]
                })
            
            milestones = [
                {
                    "week": weeks // 2,
                    "description": "Mid-point assessment",
                    "assessment": "Take practice test",
                    "criteria": "Show improvement from baseline"
                },
                {
                    "week": weeks,
                    "description": "Final assessment",
                    "assessment": "Comprehensive test",
                    "criteria": "Meet target performance level"
                }
            ]
            
            return StudyPlanResponse(
                plan=plan,
                milestones=milestones,
                recommendations=["Follow the weekly schedule", "Track progress regularly", "Adjust based on performance"],
                estimatedOutcome="Gradual improvement in understanding and test performance"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Study plan generation failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate study plan. Please try again later."
        )

@router.post("/motivation-boost", response_model=MotivationBoostResponse)
async def get_motivation_boost(
    request: MotivationBoostRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    """
    Generate AI-powered motivational content and achievement recognition.
    """
    try:
        logger.info(f"Generating motivation boost for user {current_user.email}")
        
        performance_data = await get_user_performance_data(db, current_user.user_id)
        
        prompt = f"""
        Create motivational content based on the following user information:
        
        Performance Data:
        {json.dumps([p.dict() for p in performance_data], indent=2)}
        
        Context:
        - Recent Activity: {request.recentActivity or "Regular study sessions"}
        - Current Mood: {request.mood or "Neutral"}
        
        Please provide:
        1. Personalized motivational message
        2. Recognition of achievements and progress
        3. Encouraging next goals
        4. Supportive encouragement
        
        Keep the tone positive, specific, and actionable.
        
        Respond in JSON format:
        {{
            "motivationalMessage": "inspiring personal message",
            "achievements": ["specific accomplishments to celebrate"],
            "nextGoals": ["achievable next objectives"],
            "encouragement": ["supportive statements"]
        }}
        """
        
        ai_response = await generate_ai_response(db, prompt)
        
        try:
            parsed_response = json.loads(ai_response)
            
            return MotivationBoostResponse(
                motivationalMessage=parsed_response.get("motivationalMessage", "Keep up the great work! Every step forward is progress."),
                achievements=parsed_response.get("achievements", []),
                nextGoals=parsed_response.get("nextGoals", []),
                encouragement=parsed_response.get("encouragement", [])
            )
            
        except json.JSONDecodeError:
            # Fallback motivational content
            achievements = ["Completed practice sessions", "Showed consistency in studying"]
            if performance_data:
                total_questions = sum(p.questionCount or 0 for p in performance_data)
                if total_questions > 0:
                    achievements.append(f"Answered {total_questions} questions")
                
                avg_score = sum(p.score for p in performance_data) / len(performance_data)
                if avg_score > 70:
                    achievements.append("Maintaining good performance levels")
            
            return MotivationBoostResponse(
                motivationalMessage="Your dedication to learning is commendable! Every question you practice brings you closer to your goals.",
                achievements=achievements,
                nextGoals=["Continue regular practice", "Focus on challenging areas", "Set weekly targets"],
                encouragement=[
                    "Progress may seem slow, but it's happening every day",
                    "Your effort and consistency will pay off",
                    "Believe in your ability to succeed"
                ]
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Motivation boost failed for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate motivation boost. Please try again later."
        )

@router.get("/api-key-status")
async def check_api_key_availability(db: Session = Depends(get_db)):
    """Check which AI API key types are available without exposing the actual keys."""
    availability = {}
    
    for key_type in [APIKeyType.GOOGLE, APIKeyType.OPENROUTER, APIKeyType.A4F]:
        api_key = await get_ai_api_key(db, key_type)
        availability[key_type.value] = {
            "available": api_key is not None,
            "provider_name": PROVIDER_CONFIGS[key_type]["name"]
        }
    
    return {
        "availability": availability,
        "has_any_key": any(info["available"] for info in availability.values()),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/api-key/{key_type}/status")
async def check_specific_api_key_status(
    key_type: APIKeyType, 
    db: Session = Depends(get_db)
):
    """Check if a specific API key type is available."""
    api_key = await get_ai_api_key(db, key_type)
    
    return {
        "key_type": key_type.value,
        "available": api_key is not None,
        "provider_name": PROVIDER_CONFIGS[key_type]["name"],
        "timestamp": datetime.now().isoformat()
    }

@router.get("/health")
async def ai_health_check():
    """Health check endpoint for AI services."""
    return {
        "status": "healthy",
        "service": "AI Analytics",
        "timestamp": datetime.now().isoformat()
    }
