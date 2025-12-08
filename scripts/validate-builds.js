const fs = require('fs');
const path = require('path');

// Load the builds.json file
const buildsPath = path.join(__dirname, '../app/data/builds.json');
const buildsData = JSON.parse(fs.readFileSync(buildsPath, 'utf8'));

// Flatten gods array (handle nested arrays)
function flattenAny(a) {
    if (!a) return [];
    if (!Array.isArray(a)) return [a];
    return a.flat(Infinity).filter(Boolean);
}

const gods = flattenAny(buildsData.gods || []);

console.log('='.repeat(80));
console.log('BUILDS VALIDATION REPORT');
console.log('='.repeat(80));
console.log();

// Statistics
let stats = {
    totalGods: gods.length,
    godsWithBuilds: 0,
    godsWithoutBuilds: 0,
    totalBuilds: 0,
    buildsWithoutRole: 0,
};

// Track issues
const issues = {
    godsWithoutBuilds: [],
    buildsWithoutRole: [],
};

// Role keywords to check for
const roleKeywords = ['adc', 'support', 'mid', 'jungle', 'solo', 'carry', 'middle'];

// Validate each god
gods.forEach((god) => {
    const godName = god.name || god.GodName || god.title || god.displayName || 'Unknown';
    const godBuilds = god.builds || [];
    
    if (godBuilds.length === 0) {
        issues.godsWithoutBuilds.push({
            god: godName,
            roles: god.roles || [],
        });
        stats.godsWithoutBuilds++;
    } else {
        stats.godsWithBuilds++;
        stats.totalBuilds += godBuilds.length;
        
        // Check each build for role keywords
        godBuilds.forEach((build, index) => {
            const notes = (build.notes || '').toLowerCase();
            const author = (build.author || '').toLowerCase();
            const hasRole = build.role || roleKeywords.some(keyword => 
                notes.includes(keyword) || author.includes(keyword)
            );
            
            if (!hasRole) {
                issues.buildsWithoutRole.push({
                    god: godName,
                    buildIndex: index + 1,
                    roles: god.roles || [],
                });
                stats.buildsWithoutRole++;
            }
        });
    }
});

// Print Statistics
console.log('📊 STATISTICS');
console.log('-'.repeat(80));
console.log(`Total Gods: ${stats.totalGods}`);
console.log(`Gods with Builds: ${stats.godsWithBuilds} (${((stats.godsWithBuilds / stats.totalGods) * 100).toFixed(1)}%)`);
console.log(`Gods without Builds: ${stats.godsWithoutBuilds} (${((stats.godsWithoutBuilds / stats.totalGods) * 100).toFixed(1)}%)`);
console.log(`Total Builds: ${stats.totalBuilds}`);
console.log(`Builds without Role: ${stats.buildsWithoutRole}`);
console.log();

// Print Issues
console.log('⚠️  ISSUES FOUND');
console.log('-'.repeat(80));

if (issues.godsWithoutBuilds.length > 0) {
    console.log(`\n❌ Gods without Builds (${issues.godsWithoutBuilds.length}):`);
    issues.godsWithoutBuilds.forEach(({ god, roles }) => {
        console.log(`   • ${god}${roles.length > 0 ? ` (Roles: ${roles.join(', ')})` : ''}`);
    });
} else {
    console.log('✅ All gods have at least one build!');
}

if (issues.buildsWithoutRole.length > 0) {
    console.log(`\n❌ Builds without Role (${issues.buildsWithoutRole.length}):`);
    console.log('   Each build must include: adc, support, mid, jungle, or solo in the notes');
    issues.buildsWithoutRole.forEach(({ god, buildIndex, roles }) => {
        console.log(`   • ${god} - Build #${buildIndex}${roles.length > 0 ? ` (God Roles: ${roles.join(', ')})` : ''}`);
    });
} else {
    console.log('✅ All builds include a role (adc, support, mid, jungle, or solo)!');
}

console.log();
console.log('='.repeat(80));
console.log('VALIDATION COMPLETE');
console.log('='.repeat(80));

// Exit with error code if there are issues
if (issues.godsWithoutBuilds.length > 0 || issues.buildsWithoutRole.length > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
