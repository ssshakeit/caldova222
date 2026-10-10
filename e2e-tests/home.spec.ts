import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Derive the expected posting count from the job content collection so this
// assertion stays correct as roles are added or removed.
const jobsDir = fileURLToPath(new URL('../src/content/jobs', import.meta.url));
const expectedRoleCount = readdirSync(jobsDir).filter((f) => f.endsWith('.md')).length;

test.describe('Open roles listing', () => {
    test('shows the roles grid with all postings', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Open roles' })).toBeVisible();

        const grid = page.getByTestId('roles-grid');
        await expect(grid).toBeVisible();
        await expect(page.getByTestId('role-card')).toHaveCount(expectedRoleCount);
        await expect(page.getByTestId('department-filter')).toHaveValue('');
        await expect(page.getByTestId('location-filter')).toHaveValue('');
    });

    test('filters roles by department', async ({ page }) => {
        await page.goto('/');
        const roleData = await page.getByTestId('role-card').evaluateAll((cards) =>
            cards.map((card) => ({
                department: card.getAttribute('data-department') ?? '',
                location: card.getAttribute('data-location') ?? '',
            })),
        );
        const selectedDepartment = roleData[0].department;
        const expectedCount = roleData.filter(
            (role) => role.department === selectedDepartment,
        ).length;

        await page.getByTestId('department-filter').selectOption(selectedDepartment);
        const visibleCards = page.locator('[data-testid="role-card"]:visible');
        await expect(visibleCards).toHaveCount(expectedCount);
        await expect(visibleCards.first()).toHaveAttribute(
            'data-department',
            selectedDepartment,
        );
    });

    test('filters roles by location', async ({ page }) => {
        await page.goto('/');
        const roleData = await page.getByTestId('role-card').evaluateAll((cards) =>
            cards.map((card) => ({
                department: card.getAttribute('data-department') ?? '',
                location: card.getAttribute('data-location') ?? '',
            })),
        );
        const selectedLocation = roleData[0].location;
        const expectedCount = roleData.filter(
            (role) => role.location === selectedLocation,
        ).length;

        await page.getByTestId('location-filter').selectOption(selectedLocation);
        const visibleCards = page.locator('[data-testid="role-card"]:visible');
        await expect(visibleCards).toHaveCount(expectedCount);
        await expect(visibleCards.first()).toHaveAttribute('data-location', selectedLocation);
    });

    test('combines department and location filters with AND', async ({ page }) => {
        await page.goto('/');
        const roleData = await page.getByTestId('role-card').evaluateAll((cards) =>
            cards.map((card) => ({
                department: card.getAttribute('data-department') ?? '',
                location: card.getAttribute('data-location') ?? '',
            })),
        );
        const selectedRole = roleData[0];
        const expectedCount = roleData.filter(
            (role) =>
                role.department === selectedRole.department &&
                role.location === selectedRole.location,
        ).length;

        await page.getByTestId('department-filter').selectOption(selectedRole.department);
        await page.getByTestId('location-filter').selectOption(selectedRole.location);
        const visibleCards = page.locator('[data-testid="role-card"]:visible');
        await expect(visibleCards).toHaveCount(expectedCount);
        await expect(visibleCards.first()).toHaveAttribute(
            'data-department',
            selectedRole.department,
        );
        await expect(visibleCards.first()).toHaveAttribute('data-location', selectedRole.location);
    });

    test('reset restores all roles after filtering by both fields', async ({ page }) => {
        await page.goto('/');
        const selectedRole = page.getByTestId('role-card').first();
        const department = await selectedRole.getAttribute('data-department');
        const location = await selectedRole.getAttribute('data-location');

        await page.getByTestId('department-filter').selectOption(department!);
        await page.getByTestId('location-filter').selectOption(location!);
        await page.getByTestId('filter-reset').click();

        await expect(page.getByTestId('department-filter')).toHaveValue('');
        await expect(page.getByTestId('location-filter')).toHaveValue('');
        await expect(page.locator('[data-testid="role-card"]:visible')).toHaveCount(
            expectedRoleCount,
        );
        await expect(page.getByTestId('filter-empty-state')).toBeHidden();
    });

    test('shows an empty state when the selected filters have no matches', async ({ page }) => {
        await page.goto('/');
        const roleData = await page.getByTestId('role-card').evaluateAll((cards) =>
            cards.map((card) => ({
                department: card.getAttribute('data-department') ?? '',
                location: card.getAttribute('data-location') ?? '',
            })),
        );
        const departments = [...new Set(roleData.map((role) => role.department))];
        const locations = [...new Set(roleData.map((role) => role.location))];
        let unmatchedCombination: { department: string; location: string } | undefined;

        for (const department of departments) {
            for (const location of locations) {
                if (
                    !roleData.some(
                        (role) => role.department === department && role.location === location,
                    )
                ) {
                    unmatchedCombination = { department, location };
                    break;
                }
            }
            if (unmatchedCombination) {
                break;
            }
        }

        expect(unmatchedCombination).toBeDefined();
        if (!unmatchedCombination) {
            throw new Error('Expected at least one department/location combination with no roles.');
        }

        await page
            .getByTestId('department-filter')
            .selectOption(unmatchedCombination.department);
        await page.getByTestId('location-filter').selectOption(unmatchedCombination.location);

        await expect(page.locator('[data-testid="role-card"]:visible')).toHaveCount(0);
        await expect(page.getByTestId('filter-empty-state')).toBeVisible();
        await expect(page.getByTestId('empty-state-text')).toContainText(
            'No roles match those filters.',
        );
    });

    test('links through to a role detail page', async ({ page }) => {
        await page.goto('/');
        const firstCard = page.getByTestId('role-card').first();
        const title = await firstCard.getByTestId('role-title').textContent();
        await firstCard.click();
        await expect(page.getByTestId('role-detail-title')).toHaveText(title!.trim());
        await expect(page.getByTestId('apply-form')).toBeVisible();
    });

    for (const { title, location } of [
        { title: 'Senior Frontend Engineer', location: 'Remote (US & Canada)' },
        { title: 'Financial Analyst', location: 'Woodinville, WA, USA' },
    ]) {
        test(`shows ${title} location on role cards and details`, async ({ page }) => {
            await page.goto('/');
            const card = page.getByTestId('role-card').filter({
                has: page.getByRole('heading', { name: title, exact: true }),
            });

            await expect(card).toBeVisible();
            await expect(card.getByTestId('role-location')).toHaveText(location);
            await card.click();
            await expect(page.getByText(location, { exact: true })).toBeVisible();
        });
    }

    test('has no automatically detectable accessibility violations', async ({ page }) => {
        await page.goto('/');
        const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa'])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});
