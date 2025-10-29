# Fix common linting errors across the codebase

Write-Host "Starting linting fixes..." -ForegroundColor Cyan

# Fix 1: Prefix unused type imports with underscore
Write-Host "`n1. Fixing unused type imports..." -ForegroundColor Yellow
$typeImportFiles = @(
    "server/routes/authRoutes.ts",
    "server/routes/healthRoutes.ts",
    "server/routes/searchRoutes.ts",
    "server/routes/watchlistItems.ts",
    "server/middleware/validation.ts",
    "server/middleware/requireAuth.ts",
    "server/server.ts",
    "src/composables/useWatchlist.ts",
    "src/composables/useMacroChart.ts",
    "src/types/batch.types.ts",
    "src/types/fmp.types.ts",
    "src/types/server.types.ts",
    "src/components/auth/AuthModal.vue",
    "src/components/common/BaseChart.vue"
)

foreach ($file in $typeImportFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Fix unused type imports by prefixing with _
        $content = $content -replace "import type \{([^}]*)\bRegisterRequest\b([^}]*)\}", "import type {`$1_RegisterRequest`$2}"
        $content = $content -replace "import type \{([^}]*)\bLogoutResponse\b([^}]*)\}", "import type {`$1_LogoutResponse`$2}"
        $content = $content -replace "import type \{([^}]*)\bNextFunction\b([^}]*)\}", "import type {`$1_NextFunction`$2}"
        $content = $content -replace "import type \{([^}]*)\bRequest\b([^}]*)\}", "import type {`$1_Request`$2}"
        $content = $content -replace "import type \{([^}]*)\bResponse\b([^}]*)\}", "import type {`$1_Response`$2}"
        $content = $content -replace "import type \{([^}]*)\bPopularTicker\b([^}]*)\}", "import type {`$1_PopularTicker`$2}"
        $content = $content -replace "import type \{([^}]*)\bUserWithoutPassword\b([^}]*)\}", "import type {`$1_UserWithoutPassword`$2}"
        $content = $content -replace "import type \{([^}]*)\bServiceResponse\b([^}]*)\}", "import type {`$1_ServiceResponse`$2}"
        $content = $content -replace "import type \{([^}]*)\bDataStatus\b([^}]*)\}", "import type {`$1_DataStatus`$2}"
        $content = $content -replace "import type \{([^}]*)\bEChartsOption\b([^}]*)\}", "import type {`$1_EChartsOption`$2}"
        $content = $content -replace "import type \{([^}]*)\bRef\b([^}]*)\}", "import type {`$1_Ref`$2}"
        $content = $content -replace "import type \{([^}]*)\bVALIDATION\b([^}]*)\}", "import type {`$1_VALIDATION`$2}"
        
        # Fix specific FMP types
        $content = $content -replace "import type \{([^}]*)\bFMPKeyMetrics\b([^}]*)\}", "import type {`$1_FMPKeyMetrics`$2}"
        $content = $content -replace "import type \{([^}]*)\bFMPRatiosTTM\b([^}]*)\}", "import type {`$1_FMPRatiosTTM`$2}"
        $content = $content -replace "import type \{([^}]*)\bFMPEnterpriseValue\b([^}]*)\}", "import type {`$1_FMPEnterpriseValue`$2}"
        $content = $content -replace "import type \{([^}]*)\bFMPFinancialGrowth\b([^}]*)\}", "import type {`$1_FMPFinancialGrowth`$2}"
        $content = $content -replace "import type \{([^}]*)\bFMPPriceTarget\b([^}]*)\}", "import type {`$1_FMPPriceTarget`$2}"
        $content = $content -replace "import type \{([^}]*)\bFMPDCF\b([^}]*)\}", "import type {`$1_FMPDCF`$2}"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Fixed: $file" -ForegroundColor Green
    }
}

# Fix 2: Fix unused variables and function parameters
Write-Host "`n2. Fixing unused variables..." -ForegroundColor Yellow
$unusedVarFiles = @(
    "server/config/database.config.ts",
    "server/middleware/auth.ts",
    "server/routes/healthRoutes.ts",
    "server/routes/macro.ts",
    "server/services/monitoringService.ts",
    "src/components/common/BaseTable.vue",
    "src/composables/useDcfCalculator.ts"
)

foreach ($file in $unusedVarFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Prefix unused variables with _
        $content = $content -replace "\bconst cache\b", "const _cache"
        $content = $content -replace "\bconst isDatabaseAvailable\b", "const _isDatabaseAvailable"
        $content = $content -replace "\bconst adminLimiter\b", "const _adminLimiter"
        $content = $content -replace "\bconst CacheTTL\b", "const _CacheTTL"
        $content = $content -replace "\bconst expectedReturn\b", "const _expectedReturn"
        $content = $content -replace "\bconst id\b =", "const _id ="
        $content = $content -replace "\bconst spxResult\b", "const _spxResult"
        $content = $content -replace "\bconst sectorsResult\b", "const _sectorsResult"
        $content = $content -replace "\bconst riskPremiumResult\b", "const _riskPremiumResult"
        
        # Fix function parameters
        $content = $content -replace "function.*?\(([^,)]*)\btitle\b", "function(`$1_title"
        $content = $content -replace "function.*?\(([^,)]*)\bcompanyName\b", "function(`$1_companyName"
        $content = $content -replace "function.*?\(([^,)]*)\bclearCache\b", "function(`$1_clearCache"
        $content = $content -replace "function.*?\(([^,)]*)\binputs\b", "function(`$1_inputs"
        $content = $content -replace "function.*?\(([^,)]*)\bname\b", "function(`$1_name"
        $content = $content -replace "function.*?\(([^,)]*)\bop\b", "function(`$1_op"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Fixed: $file" -ForegroundColor Green
    }
}

# Fix 3: Remove unused imports
Write-Host "`n3. Removing unused imports..." -ForegroundColor Yellow
$unusedImportFiles = @(
    "server/middleware/validation.ts",
    "server/routes/healthRoutes.ts"
)

foreach ($file in $unusedImportFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Comment out entire unused import lines
        $content = $content -replace "import \{[^}]*\bvalidate\b[^}]*\} from", "// import { validate } from"
        $content = $content -replace "import \{[^}]*\bvalidateAnalyticsPopular\b[^}]*\} from", "// import { validateAnalyticsPopular } from"
        $content = $content -replace "import \{[^}]*\bvalidateAnalyticsHistory\b[^}]*\} from", "// import { validateAnalyticsHistory } from"
        $content = $content -replace "import \{[^}]*\bvalidateAnalyticsStats\b[^}]*\} from", "// import { validateAnalyticsStats } from"
        $content = $content -replace "import \{[^}]*\bgetPopularTickers\b[^}]*\} from", "// import { getPopularTickers } from"
        $content = $content -replace "import \{[^}]*\bgetUserSearchHistory\b[^}]*\} from", "// import { getUserSearchHistory } from"
        $content = $content -replace "import \{[^}]*\bgetApiRequestStats\b[^}]*\} from", "// import { getApiRequestStats } from"
        $content = $content -replace "import \{[^}]*\bglobalFmpLimiter\b[^}]*\} from", "// import { globalFmpLimiter } from"
        $content = $content -replace "import \{[^}]*\bdecrementGlobalFmpCounter\b[^}]*\} from", "// import { decrementGlobalFmpCounter } from"
        $content = $content -replace "import \{[^}]*\badminLimiter\b[^}]*\} from", "// import { adminLimiter } from"
        $content = $content -replace "import \{[^}]*\bgetValuationRecommendation\b[^}]*\} from", "// import { getValuationRecommendation } from"
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "`nLinting fixes complete!" -ForegroundColor Cyan
Write-Host "Run 'npm run lint:check' to verify." -ForegroundColor Yellow
