# Split work into 10 stacked PRs from stash@{0}
$ErrorActionPreference = "Continue"
Set-Location "d:\Development\Proj Test"

function Restore-FromStash([string[]]$Paths) {
    foreach ($p in $Paths) {
        $null = git checkout 'stash@{0}' -- "$p" 2>&1
        if ($LASTEXITCODE -ne 0) {
            $null = git checkout 'stash@{0}^3' -- "$p" 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Could not restore: $p"
            }
        }
    }
}

function New-PrBranch([string]$Name, [string]$Base) {
    git checkout $Base
    git reset --hard $Base
    git branch -D $Name 2>$null
    git checkout -b $Name
}

function Commit-And-Push([string]$Message, [string[]]$Files) {
    foreach ($f in $Files) { git add -- "$f" }
    $status = git status --porcelain
    if (-not $status) {
        Write-Warning "Nothing to commit"
        return $false
    }
    git commit -m $Message
    git -c http.sslBackend=schannel push -u origin HEAD
    return $true
}

$prs = @(
    @{
        Num = 1; Branch = "pr/01-rbac-session-auth"; Base = "main"
        Title = "feat: RBAC session auth foundation"
        Body = @"
## Summary
- Add permissions model, session keys, and auth guards
- Extend tenant DB context and admin Prisma client for multi-tenant auth

## Test plan
- [ ] Run ``npm test -- lib/auth``
- [ ] Verify login/session still works
"@
        Files = @(
            "lib/auth/permissions.ts", "lib/auth/permissions.test.ts", "lib/auth/guards.ts",
            "lib/auth/session-key.ts", "lib/auth/session-key.test.ts", "lib/auth/callbacks.ts",
            "lib/auth/callbacks.edge.ts", "lib/auth/auth.config.ts", "lib/auth/index.ts",
            "types/auth.d.ts", "types/next-auth.d.ts",
            "lib/db/get-tenant-db.ts", "lib/db/admin-prisma.ts", "lib/db/tenant-context.ts"
        )
        PrBase = "main"
    },
    @{
        Num = 2; Branch = "pr/02-rbac-enforcement"; Base = "pr/01-rbac-session-auth"
        Title = "feat: RBAC enforcement in actions and middleware"
        Body = @"
## Summary
- Enforce permissions in server actions and middleware
- Add billing limits and audit logging for guarded operations

## Test plan
- [ ] Verify unauthorized users are blocked from protected actions
- [ ] Check middleware redirects for missing permissions
"@
        Files = @(
            "lib/actions/projects.ts", "lib/actions/crm.ts", "lib/actions/settings.ts",
            "lib/actions/billing.ts", "lib/actions/dashboard.ts", "lib/actions/tenant.ts",
            "components/layout/app-shell.tsx", "middleware.ts", "lib/audit.ts", "lib/billing/limits.ts"
        )
        PrBase = "pr/01-rbac-session-auth"
    },
    @{
        Num = 3; Branch = "pr/03-invitations"; Base = "pr/02-rbac-enforcement"
        Title = "feat: workspace member invitations"
        Body = @"
## Summary
- Add invitation flow with accept-invite UI
- Add invitation RLS migration and members settings

## Test plan
- [ ] Send and accept an invitation
- [ ] Verify RLS migration applies cleanly
"@
        Files = @(
            "lib/actions/members.ts", "components/settings/members-settings-form.tsx",
            "components/auth/accept-invite-button.tsx", "app/(auth)/invite/",
            "prisma/migrations/20260705060000_invitation_rls/", "docs/ACCESS_CONTROL.md",
            "app/(app)/settings/page.tsx", "prisma/schema.prisma"
        )
        PrBase = "pr/02-rbac-enforcement"
    },
    @{
        Num = 4; Branch = "pr/04-stripe-setup"; Base = "pr/03-invitations"
        Title = "feat: Stripe setup and billing configuration"
        Body = @"
## Summary
- Add Stripe setup panel and billing settings improvements
- Document Stripe env vars

## Test plan
- [ ] Configure Stripe keys in settings
- [ ] Run ``npm test -- lib/billing/stripe-setup``
"@
        Files = @(
            "lib/billing/stripe-setup.ts", "lib/billing/stripe-setup.test.ts",
            "components/settings/stripe-setup-panel.tsx", "components/settings/billing-settings-form.tsx",
            "lib/actions/billing.ts", ".env.example", "app/(app)/settings/page.tsx"
        )
        PrBase = "pr/03-invitations"
    },
    @{
        Num = 5; Branch = "pr/05-projects-ux-perf"; Base = "pr/04-stripe-setup"
        Title = "feat: projects UX and performance improvements"
        Body = @"
## Summary
- Add project shell, tabs, edit dialog, baselines, and lazy Gantt
- Improve project caching and queries

## Test plan
- [ ] Navigate project tabs and Gantt view
- [ ] Create/edit projects with new dialogs
"@
        Files = @(
            "components/projects/edit-project-dialog.tsx", "components/projects/project-actions.tsx",
            "components/projects/baselines-panel.tsx", "components/projects/project-shell.tsx",
            "components/projects/project-tabs.tsx", "components/gantt/project-gantt-lazy.tsx",
            "app/(app)/projects/", "lib/projects/queries.ts", "lib/projects/project-form-data.ts",
            "lib/cache/keys.ts", "lib/cache/invalidate.ts", "lib/actions/projects.ts"
        )
        PrBase = "pr/04-stripe-setup"
    },
    @{
        Num = 6; Branch = "pr/06-vtiger-infra"; Base = "pr/05-projects-ux-perf"
        Title = "feat: VTiger integration infrastructure"
        Body = @"
## Summary
- Add VTiger client, session, config, and setup utilities
- Update docker-compose and README for VTiger

## Test plan
- [ ] Run ``npm test -- lib/vtiger``
- [ ] Verify VTiger env configuration
"@
        Files = @(
            "lib/vtiger/client.ts", "lib/vtiger/config.ts", "lib/vtiger/errors.ts",
            "lib/vtiger/mappers.ts", "lib/vtiger/session.ts", "lib/vtiger/setup.ts",
            "lib/vtiger/setup.test.ts", "lib/vtiger/types.ts", "lib/vtiger/validate.ts",
            "lib/vtiger/validate.test.ts", "lib/actions/vtiger.ts", "docker-compose.yml",
            ".env.example", "README.md"
        )
        PrBase = "pr/05-projects-ux-perf"
    },
    @{
        Num = 7; Branch = "pr/07-vtiger-crm-ui"; Base = "pr/06-vtiger-infra"
        Title = "feat: VTiger-backed CRM UI"
        Body = @"
## Summary
- Add CRM tabs, pages, and VTiger-aware create dialogs
- Update command palette and dashboard for CRM navigation

## Test plan
- [ ] Browse CRM modules with VTiger configured
- [ ] Run e2e smoke tests
"@
        Files = @(
            "lib/actions/vtiger-crm.ts", "app/(app)/crm/", "components/crm/crm-tabs.tsx",
            "components/crm/vtiger-setup-prompt.tsx", "components/crm/crm-project-links.tsx",
            "components/crm/create-account-dialog.tsx", "components/crm/create-activity-dialog.tsx",
            "components/crm/create-contact-dialog.tsx", "components/crm/create-lead-dialog.tsx",
            "components/crm/create-opportunity-dialog.tsx", "components/crm/account-list.tsx",
            "components/layout/command-palette.tsx", "components/dashboard/dashboard-grid.tsx",
            "lib/actions/crm.ts", "e2e/smoke.spec.ts"
        )
        PrBase = "pr/06-vtiger-infra"
    },
    @{
        Num = 8; Branch = "pr/08-project-vtiger-links"; Base = "pr/07-vtiger-crm-ui"
        Title = "feat: project-VTiger record links"
        Body = @"
## Summary
- Link projects to VTiger accounts and contacts
- Add migration and link fields on project forms

## Test plan
- [ ] Link a project to VTiger records
- [ ] Verify links appear on CRM detail pages
"@
        Files = @(
            "lib/actions/project-vtiger-links.ts", "components/projects/vtiger-link-fields.tsx",
            "components/projects/create-project-dialog.tsx", "components/projects/edit-project-dialog.tsx",
            "components/projects/project-shell.tsx",
            "app/(app)/crm/accounts/[id]/page.tsx", "app/(app)/crm/contacts/[id]/page.tsx",
            "prisma/migrations/20260706000000_project_vtiger_links/", "prisma/schema.prisma"
        )
        PrBase = "pr/07-vtiger-crm-ui"
    },
    @{
        Num = 9; Branch = "pr/09-per-tenant-vtiger-config"; Base = "pr/08-project-vtiger-links"
        Title = "feat: per-tenant VTiger configuration"
        Body = @"
## Summary
- Store VTiger credentials per tenant
- Add CRM settings form and VTiger setup panel

## Test plan
- [ ] Configure VTiger per workspace in settings
- [ ] Run migration and seed
"@
        Files = @(
            "prisma/migrations/20260706120000_tenant_vtiger_config/",
            "lib/vtiger/config.ts", "lib/vtiger/session.ts",
            "components/settings/vtiger-setup-panel.tsx", "components/settings/crm-settings-form.tsx",
            "lib/actions/vtiger.ts", "docs/VTIGER_INTEGRATION.md", "prisma/seed.ts",
            "prisma/schema.prisma", "app/(app)/settings/page.tsx"
        )
        PrBase = "pr/08-project-vtiger-links"
    },
    @{
        Num = 10; Branch = "pr/10-multi-company"; Base = "pr/09-per-tenant-vtiger-config"
        Title = "feat: multi-company workspace support"
        Body = @"
## Summary
- Add company creation, tenant switcher, and onboarding/signup flows
- Document multi-company access control

## Test plan
- [ ] Create a second company and switch tenants
- [ ] Complete onboarding and signup flows
"@
        Files = @(
            "components/companies/create-company-dialog.tsx", "components/layout/tenant-switcher.tsx",
            "lib/actions/auth.ts", "app/(auth)/onboarding/page.tsx", "app/(auth)/signup/page.tsx",
            "components/auth/login-form.tsx", "components/settings/workspace-settings-form.tsx",
            "lib/validations/settings-schemas.ts", "docs/MULTI_COMPANY.md", "docs/ACCESS_CONTROL.md",
            "scripts/capture-manual-screenshots.ts", "app/(app)/settings/page.tsx",
            "lib/actions/tenant.ts", "lib/validations/schemas.ts"
        )
        PrBase = "pr/09-per-tenant-vtiger-config"
    }
)

$prUrls = @()

foreach ($pr in $prs) {
    Write-Host "`n========== PR$($pr.Num): $($pr.Branch) ==========" -ForegroundColor Cyan
    New-PrBranch $pr.Branch $pr.Base
    Restore-FromStash $pr.Files
    if (Commit-And-Push $pr.Title $pr.Files) {
        $bodyFile = New-TemporaryFile
        Set-Content -Path $bodyFile -Value $pr.Body -Encoding utf8
        $url = gh pr create --title $pr.Title --base $pr.PrBase --body-file $bodyFile 2>&1
        Remove-Item $bodyFile -Force
        Write-Host "PR URL: $url" -ForegroundColor Green
        $prUrls += $url
    }
}

Write-Host "`n========== ALL PRs ==========" -ForegroundColor Yellow
$prUrls | ForEach-Object { Write-Host $_ }
git checkout main
