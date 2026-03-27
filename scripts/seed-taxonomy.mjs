#!/usr/bin/env node

// Seed script for enhanced taxonomy v2 with semantic metadata
// Imports 1220 tags and 2440 relations from taxonomy-seed.json

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (same pattern as sync-kudago.mjs)
const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

// Create Supabase admin client
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedTaxonomy() {
  try {
    console.log('🌱 Starting taxonomy seed...');
    
    // Step 1: Read and parse taxonomy JSON
    console.log('📖 Reading taxonomy-seed.json...');
    const taxonomyPath = join(__dirname, 'taxonomy-seed.json');
    const taxonomyData = JSON.parse(readFileSync(taxonomyPath, 'utf-8'));
    console.log(`📊 Loaded ${taxonomyData.length} tags from taxonomy`);
    
    // Step 2: Insert tags in chunks of 100
    console.log('🏷️ Inserting tags...');
    const chunkSize = 100;
    const totalChunks = Math.ceil(taxonomyData.length / chunkSize);
    const insertedSlugs = new Set();
    
    // Simple English to Russian mapping for common terms
    const simpleRussianMap = {
      // Lifestyle terms
      'mindful meditation': 'Осознанная медитация',
      'hiit workout': 'HIIT тренировка',
      'plant based diet': 'Растительная диета',
      'skincare routine': 'Уход за кожей',
      'street fashion': 'Уличная мода',
      'minimalist living': 'Минималистичный образ жизни',
      'yoga practice': 'Практика йоги',
      'crossfit training': 'Кроссфит тренировки',
      'ketogenic diet': 'Кетогенная диета',
      'cosmetic procedures': 'Косметические процедуры',
      'vintage fashion': 'Винтажная мода',
      'smart furniture': 'Умная мебель',
      
      // Technology terms
      'machine learning': 'Машинное обучение',
      'time management apps': 'Приложения тайм-менеджмента',
      'mobile gaming': 'Мобильные игры',
      'virtual reality': 'Виртуальная реальность',
      'wearable technology': 'Носимая технология',
      'cloud computing': 'Облачные вычисления',
      'cybersecurity': 'Кибербезопасность',
      'iot devices': 'IoT устройства',
      'data analytics': 'Анализ данных',
      'mobile apps': 'Мобильные приложения',
      
      // Business terms
      'freelance business': 'Фриланс бизнес',
      'content marketing': 'Контент-маркетинг',
      'accounting software': 'Бухгалтерское ПО',
      'project management': 'Управление проектами',
      'professional networking': 'Профессиональные сети',
      'startup incubation': 'Инкубация стартапов',
      'business analytics': 'Бизнес-аналитика',
      'supply chain management': 'Управление цепочками поставок',
      
      // Health terms
      'stress management': 'Управление стрессом',
      'cardio fitness': 'Кардио фитнес',
      'medical checkups': 'Медицинские осмотры',
      'herbal medicine': 'Травяная медицина',
      
      // Learning terms
      'web development': 'Веб-разработка',
      'negotiation skills': 'Навыки переговоров',
      'illustration art': 'Иллюстрация',
      'spanish language': 'Испанский язык',
      'scientific method': 'Научный метод',
      
      // Entertainment terms
      'music festivals': 'Музыкальные фестивали',
      'photography exhibition': 'Фотовыставка',
      'dance performance': 'Танцевальное представление',
      'independent film': 'Независимое кино',
      'improv comedy': 'Импровизационная комедия',
      'cocktail bars': 'Коктейльные бары',
      
      // Food terms
      'asian cuisine': 'Азиатская кухня',
      'gluten free diet': 'Безглютеновая диета',
      'wine tasting': 'Дегустация вина',
      'food trucks': 'Фудтраки',
      'baking skills': 'Навыки выпечки',
      
      // Sports terms
      'basketball games': 'Баскетбольные игры',
      'swimming fitness': 'Плавание для фитнеса',
      'hiking trails': 'Пешие тропы',
      'rock climbing': 'Скалолазание',
      'gaming community': 'Игровое сообщество',
      
      // And so on for other categories...
    };
    
    // Function to get Russian name or create a simple transliteration
    const getRussianName = (englishTag) => {
      if (simpleRussianMap[englishTag]) {
        return simpleRussianMap[englishTag];
      }
      // For concept tags, create a simple Russian version
      if (englishTag.includes('concept')) {
        return englishTag.replace(/concept/gi, 'концепт').replace(/(\d+)/g, ' $1');
      }
      // Basic transliteration for remaining tags
      return englishTag;
    };
    
    // Map category to category_slug (using existing categories)
    const getCategorySlug = (category) => {
      const categoryMap = {
        'lifestyle': 'other', // Map to "Другое" for lifestyle
        'technology': 'business', // Map to "Бизнес" for tech
        'business': 'business',
        'health': 'other', // Map to "Другое" for health
        'learning': 'education',
        'entertainment': 'party', // Map to "Вечеринки" for entertainment
        'relationships': 'other', // Map to "Другое" for relationships
        'food': 'food',
        'sports': 'sport',
        'creativity': 'art',
        'luxury': 'other', // Map to "Другое" for luxury
        'sustainability': 'other', // Map to "Другое" for sustainability
        'social_impact': 'business', // Map to "Бизнес" for social impact
        'career': 'business',
        'mobility': 'other', // Map to "Другое" for mobility
        'finance': 'business',
        'home': 'other' // Map to "Другое" for home
      };
      return categoryMap[category] || 'other';
    };
    
    for (let i = 0; i < taxonomyData.length; i += chunkSize) {
      const chunk = taxonomyData.slice(i, i + chunkSize);
      const chunkNumber = Math.floor(i / chunkSize) + 1;
      
      // Map tags to database format
      const tagRecords = chunk.map(tag => ({
        slug: tag.slug,
        name_ru: getRussianName(tag.tag),
        category_slug: null, // Set to NULL for v2 tags (legacy column)
        tag: tag.tag,
        category: tag.category,
        domain: tag.domain,
        cluster: tag.cluster,
        tag_type: tag.tag_type,
        intent_type: tag.intent_type,
        emotional_signal: tag.emotional_signal,
        lifecycle_stage: tag.lifecycle_stage,
        accessibility_level: tag.accessibility_level,
        decay_factor: tag.decay_factor,
        global_relevance_score: tag.global_relevance_score,
        cross_domain_power: tag.cross_domain_power,
        usage_count: 0
      }));
      
      // Upsert tags
      const { data, error, count } = await supabase
        .from('tags')
        .upsert(tagRecords, {
          onConflict: 'slug',
          ignoreDuplicates: false
        })
        .select('slug');
      
      if (error) {
        console.error(`❌ Error inserting tag chunk ${chunkNumber}/${totalChunks}:`, error);
        throw error;
      }
      
      // Collect inserted slugs
      if (data) {
        data.forEach(record => insertedSlugs.add(record.slug));
      }
      
      console.log(`✅ Tags chunk ${chunkNumber}/${totalChunks}: inserted ${count || data?.length || 0} tags`);
    }
    
    console.log(`📈 Total tags inserted: ${insertedSlugs.size}`);
    
    // Step 3: Insert tag relations from file
    console.log('🔗 Inserting tag relations...');
    
    // Build set of all inserted slugs
    const allSlugs = new Set(taxonomyData.map(t => t.slug));

    // Extract relations from file
    const relations = [];
    taxonomyData.forEach(tag => {
      (tag.suggested_relations || []).forEach(rel => {
        if (
          rel.related_tag &&
          allSlugs.has(rel.related_tag) &&
          rel.related_tag !== tag.slug
        ) {
          relations.push({
            tag_slug: tag.slug,
            related_tag_slug: rel.related_tag,
            relation_type: rel.relation_type,
            strength: rel.strength
          });
        }
      });
    });

    console.log('Relations from file:', relations.length);
    console.log('Skipped (slug not found):', taxonomyData.reduce((a,t) => a + (t.suggested_relations?.length || 0), 0) - relations.length);

    // Insert in chunks of 200
    for (let i = 0; i < relations.length; i += 200) {
      const chunk = relations.slice(i, i + 200);
      const { error } = await supabase
        .from('tag_relations')
        .upsert(chunk, { onConflict: 'tag_slug,related_tag_slug,relation_type' });
      if (error) console.error('Relations chunk error:', error.message);
      else console.log('Relations chunk', Math.floor(i/200)+1, 'inserted:', chunk.length);
    }
    
    // Step 4: Final verification
    console.log('🔍 Running verification queries...');
    
    const { count: tagCount, error: tagError } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true })
      .not('domain', 'is', null);
    
    if (tagError) {
      console.error('❌ Error counting tags:', tagError);
    } else {
      console.log(`📊 Tags with domain metadata: ${tagCount}`);
    }
    
    const { count: relationCount, error: relationError } = await supabase
      .from('tag_relations')
      .select('*', { count: 'exact', head: true });
    
    if (relationError) {
      console.error('❌ Error counting relations:', relationError);
    } else {
      console.log(`🔗 Tag relations inserted: ${relationCount}`);
    }
    
    // Category breakdown
    const { data: categoryBreakdown, error: catError } = await supabase
      .from('tags')
      .select('category')
      .not('category', 'is', null);
    
    if (!catError && categoryBreakdown) {
      const categories = {};
      categoryBreakdown.forEach(tag => {
        categories[tag.category] = (categories[tag.category] || 0) + 1;
      });
      console.log('📈 Tags per category:');
      Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
        console.log(`  - ${cat}: ${count}`);
      });
    }
    
    console.log('🎉 Taxonomy seed completed successfully!');
    console.log(`📋 Summary: ${tagCount} tags, ${relationCount} relations imported`);
    
  } catch (error) {
    console.error('❌ Taxonomy seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedTaxonomy();
