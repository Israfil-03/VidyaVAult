import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    console.log('🔍 Checking Azure PostgreSQL Database Schema...\n');

    // Execute raw query to check table structure
    const columnsResult = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'QuestionBankEntry'
      ORDER BY ordinal_position
    `;

    console.log('✅ Connected to Azure PostgreSQL\n');
    console.log('📋 QuestionBankEntry Columns:\n');
    console.log('Column Name          | Data Type       | Nullable');
    console.log('─'.repeat(55));

    const columns = columnsResult || [];
    columns.forEach((row) => {
      console.log(
        row.column_name.padEnd(20) + ' | ' +
        row.data_type.padEnd(15) + ' | ' +
        (row.is_nullable === 'YES' ? 'YES' : 'NO')
      );
    });

    // Check for missing columns
    console.log('\n📊 Status Check:');
    const hasTeacherId = columns.some(r => r.column_name === 'teacherId');
    const hasIsPublic = columns.some(r => r.column_name === 'isPublic');

    console.log(`  ✓ teacherId:  ${hasTeacherId ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  ✓ isPublic:   ${hasIsPublic ? '✅ EXISTS' : '❌ MISSING'}`);

    if (!hasTeacherId || !hasIsPublic) {
      console.log('\n⚠️  MISSING COLUMNS DETECTED!');
      console.log('   → Migration needs to be applied');
    } else {
      console.log('\n✅ All required columns present!');
    }

    // Check migration history
    console.log('\n📝 Recent Migrations:');
    try {
      const migrationsResult = await prisma.$queryRaw`
        SELECT migration, finished_at
        FROM "_prisma_migrations"
        ORDER BY finished_at DESC
        LIMIT 7
      `;

      migrationsResult.forEach(row => {
        console.log(`  • ${row.migration}`);
      });
    } catch (err) {
      console.log('  (Migration info unavailable)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('relation')) {
      console.error('→ Table might not exist yet');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
