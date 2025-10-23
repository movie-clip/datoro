"""
Prompts Configuration - AI prompt templates

Defines prompts for generating competitive advantages and investment risks.
"""

from typing import Dict, Optional


def get_advantages_prompt(ticker: str, company_name: str, company_data: Optional[Dict] = None) -> str:
    """
    Generate prompt for competitive advantages analysis.
    
    Args:
        ticker: Ticker symbol
        company_name: Company name
        company_data: Optional FMP data to enrich prompt
        
    Returns:
        str: Formatted prompt
    """
    # Base prompt
    prompt = f"""You are a financial analyst. Analyze the competitive advantages of {company_name} ({ticker}).

"""
    
    # Add FMP data context if available
    if company_data:
        prompt += "Company Context:\n"
        
        if 'industry' in company_data:
            prompt += f"- Industry: {company_data['industry']}\n"
        if 'sector' in company_data:
            prompt += f"- Sector: {company_data['sector']}\n"
        if 'revenue' in company_data:
            prompt += f"- Revenue (TTM): ${company_data['revenue']}B\n"
        if 'profit_margin' in company_data:
            prompt += f"- Profit Margin: {company_data['profit_margin']}%\n"
        if 'pe_ratio' in company_data:
            prompt += f"- P/E Ratio: {company_data['pe_ratio']}\n"
        if 'revenue_growth' in company_data:
            prompt += f"- Revenue Growth (YoY): {company_data['revenue_growth']}%\n"
        
        prompt += "\n"
    
    # Instructions
    prompt += """Identify exactly 3 competitive advantages. For each advantage, provide:
- A concise title (2-10 words)
- A detailed description (20-100 words)

Focus on:
- Network effects and switching costs
- Brand loyalty and moat protection
- Scale advantages and barriers to entry
- Technology and intellectual property
- Distribution and supply chain advantages

Return ONLY a JSON array in this exact format:
[
  {"title": "Network Effects", "description": "Detailed explanation..."},
  {"title": "Brand Loyalty", "description": "Detailed explanation..."},
  {"title": "Switching Costs", "description": "Detailed explanation..."}
]

Do not include any text before or after the JSON array."""
    
    return prompt


def get_risks_prompt(ticker: str, company_name: str, company_data: Optional[Dict] = None) -> str:
    """
    Generate prompt for investment risks analysis.
    
    Args:
        ticker: Ticker symbol
        company_name: Company name
        company_data: Optional FMP data to enrich prompt
        
    Returns:
        str: Formatted prompt
    """
    # Base prompt
    prompt = f"""You are a financial analyst. Analyze the investment risks for {company_name} ({ticker}).

"""
    
    # Add FMP data context if available
    if company_data:
        prompt += "Company Context:\n"
        
        if 'industry' in company_data:
            prompt += f"- Industry: {company_data['industry']}\n"
        if 'sector' in company_data:
            prompt += f"- Sector: {company_data['sector']}\n"
        if 'revenue' in company_data:
            prompt += f"- Revenue (TTM): ${company_data['revenue']}B\n"
        if 'profit_margin' in company_data:
            prompt += f"- Profit Margin: {company_data['profit_margin']}%\n"
        if 'pe_ratio' in company_data:
            prompt += f"- P/E Ratio: {company_data['pe_ratio']}\n"
        if 'debt_to_equity' in company_data:
            prompt += f"- Debt-to-Equity: {company_data['debt_to_equity']}\n"
        
        prompt += "\n"
    
    # Instructions
    prompt += """Identify exactly 3 investment risks. For each risk, provide:
- A concise title (2-10 words)
- A detailed description (20-100 words)

Focus on:
- Valuation concerns and market sentiment
- Competition and market disruption
- Regulatory and legal risks
- Business model vulnerabilities
- Macroeconomic and cyclical risks

Return ONLY a JSON array in this exact format:
[
  {"title": "Valuation Concerns", "description": "Detailed explanation..."},
  {"title": "Regulatory Scrutiny", "description": "Detailed explanation..."},
  {"title": "Market Competition", "description": "Detailed explanation..."}
]

Do not include any text before or after the JSON array."""
    
    return prompt


# Example prompts for testing
EXAMPLE_ADVANTAGES_PROMPT = get_advantages_prompt("AAPL", "Apple Inc.")
EXAMPLE_RISKS_PROMPT = get_risks_prompt("AAPL", "Apple Inc.")


if __name__ == "__main__":
    # Test prompt generation
    print("=== Testing Prompts Configuration ===\n")
    
    print("1. Basic Advantages Prompt:")
    print("-" * 50)
    print(get_advantages_prompt("AAPL", "Apple Inc."))
    print("\n")
    
    print("2. Enriched Advantages Prompt (with FMP data):")
    print("-" * 50)
    company_data = {
        'industry': 'Consumer Electronics',
        'sector': 'Technology',
        'revenue': '394.3',
        'profit_margin': '26.3',
        'pe_ratio': '29.5',
        'revenue_growth': '7.8'
    }
    print(get_advantages_prompt("AAPL", "Apple Inc.", company_data))
    print("\n")
    
    print("3. Basic Risks Prompt:")
    print("-" * 50)
    print(get_risks_prompt("MSFT", "Microsoft Corporation"))
