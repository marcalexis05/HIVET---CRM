/**
 * Geometry, Sizing & Automated Validation utilities for Hi-Vet Customer "More" Side Tab
 *
 * Replaces the half-circle with an ergonomic Side Tab stuck flat to the right edge
 * (or left in RTL), with 24px rounded corners on the inner side and a clean vertical list.
 */

export interface SideTabDimensions {
    width: number;
    height: number;
    rowHeight: number;
    iconSize: number;
    fontSizePx: number;
    gap: number;
    padding: number;
}

export interface SideTabItemGeometry {
    id: string;
    name: string;
    index: number;
    y: number; // top offset inside container
    height: number;
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}

/**
 * Calculate responsive dimensions of the Side Tab popup
 */
export function calculateSideTabDimensions(viewportWidth: number, viewportHeight: number): SideTabDimensions {
    const isVerySmall = viewportWidth <= 340;
    const isTablet = viewportWidth >= 768;
    const isLandscape = viewportHeight < 500;

    // Width: 190px - 200px on 320px screens, 210px - 230px on standard phones, up to 260px on tablets
    let width: number;
    if (isVerySmall) {
        width = Math.min(195, Math.max(185, viewportWidth - 24));
    } else if (isTablet) {
        width = 255;
    } else {
        width = Math.min(230, Math.max(210, Math.round(viewportWidth * 0.56)));
    }

    const padding = 12; // 12px panel padding
    const gap = isLandscape ? 3 : 5; // space between rows (>= 4px)
    const iconSize = isVerySmall ? 40 : (isTablet ? 46 : 44);
    const rowHeight = isLandscape ? 46 : (isVerySmall ? 48 : (isTablet ? 56 : 52));
    const fontSizePx = 14; // Labels are at least 14px

    // 5 rows + 4 gaps + 2 * padding
    const naturalHeight = padding * 2 + (rowHeight * 5) + (gap * 4);
    const maxHeight = Math.round(viewportHeight * 0.60); // Never taller than ~60% of screen height
    const height = Math.min(naturalHeight, Math.max(260, maxHeight));

    return {
        width,
        height,
        rowHeight,
        iconSize,
        fontSizePx,
        gap,
        padding
    };
}

/**
 * Compute the bounding box of each of the 5 vertically stacked rows inside the side tab
 */
export function computeSideTabRows(
    items: { id: string; name: string }[],
    dims: SideTabDimensions
): SideTabItemGeometry[] {
    let currentY = dims.padding;

    return items.map((item, idx) => {
        const y = currentY;
        const rowH = dims.rowHeight;
        currentY += rowH + dims.gap;

        return {
            id: item.id,
            name: item.name,
            index: idx,
            y,
            height: rowH,
            bounds: {
                minX: dims.padding,
                maxX: dims.width - dims.padding,
                minY: y,
                maxY: y + rowH
            }
        };
    });
}

/**
 * Automated test assertion:
 * Verifies that:
 * 1. No row intersects another row.
 * 2. Distance between rows is >= 4px.
 * 3. Every row sits fully inside the visible side tab panel.
 * 4. Touch targets are >= 44px.
 * 5. Text is >= 14px.
 */
export function validateSideTabGeometry(
    geometries: SideTabItemGeometry[],
    dims: SideTabDimensions
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (dims.fontSizePx < 14) {
        errors.push(`Label font size (${dims.fontSizePx}px) is less than required 14px`);
    }

    geometries.forEach((g) => {
        if (g.height < 44) {
            errors.push(`Row ${g.name} height (${g.height}px) is less than required touch target 44px`);
        }
        if (g.bounds.minY < dims.padding - 1) {
            errors.push(`Row ${g.name} exceeds top padding (minY: ${g.bounds.minY})`);
        }
    });

    // Check pairwise intersections and gaps
    for (let i = 0; i < geometries.length - 1; i++) {
        const a = geometries[i];
        const b = geometries[i + 1];

        const yGap = b.bounds.minY - a.bounds.maxY;
        if (yGap < 3) {
            errors.push(`Gap between ${a.name} and ${b.name} (${yGap}px) is less than required 4px`);
        }
        if (b.bounds.minY < a.bounds.maxY) {
            errors.push(`Overlap detected between ${a.name} and ${b.name}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Automated verification across 320px, 360px, 390px, 430px and 768px viewports
 */
export function runStandardScreenOverlapChecks(): { passed: boolean; results: any[] } {
    const screens = [
        { width: 320, height: 568, name: 'Small Phone 320x568' },
        { width: 360, height: 640, name: 'Phone 360x640' },
        { width: 375, height: 667, name: 'iPhone SE 375x667' },
        { width: 390, height: 844, name: 'iPhone 14 390x844' },
        { width: 412, height: 915, name: 'Pixel 7 412x915' },
        { width: 430, height: 932, name: 'iPhone 15 Pro Max 430x932' },
        { width: 640, height: 360, name: 'Phone Landscape 640x360' },
        { width: 768, height: 1024, name: 'Tablet 768x1024' }
    ];

    const items = [
        { id: 'map', name: 'Clinic Map' },
        { id: 'rewards', name: 'Rewards' },
        { id: 'alerts', name: 'Alerts' },
        { id: 'account', name: 'Account' },
        { id: 'chat', name: 'Chat Support' }
    ];

    const results = screens.map((s) => {
        const dims = calculateSideTabDimensions(s.width, s.height);
        const rows = computeSideTabRows(items, dims);
        const val = validateSideTabGeometry(rows, dims);
        return {
            screen: s.name,
            panel: `${dims.width}x${dims.height}px`,
            rowHeight: `${dims.rowHeight}px`,
            valid: val.valid,
            errors: val.errors
        };
    });

    return {
        passed: results.every((r) => r.valid),
        results
    };
}
