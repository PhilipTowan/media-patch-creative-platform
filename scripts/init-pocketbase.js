#!/usr/bin/env node

/**
 * PocketBase Initialization Script for The Media Patch
 * This script sets up the database collections and initial data
 */

const PocketBase = require('pocketbase')
const bcrypt = require('bcryptjs')

const pb = new PocketBase('http://localhost:8090')

// God Mode emails
const GOD_MODE_EMAILS = ['philiptowan@gmail.com', 'octofiend@gmail.com']

// Collection schemas
const COLLECTIONS_SCHEMA = {
  users: {
    name: 'users',
    type: 'auth',
    schema: [
      { name: 'username', type: 'text', required: true, options: { min: 3, max: 50 } },
      { name: 'avatar', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } },
      { name: 'isGodMode', type: 'bool', options: { default: false } },
      { name: 'role', type: 'text', options: { default: 'user' } },
      { name: 'last_login', type: 'date' },
      { name: 'last_ip', type: 'text' },
      { name: 'preferences', type: 'json' },
      { name: 'bio', type: 'text', options: { max: 500 } },
      { name: 'location', type: 'text', options: { max: 100 } },
      { name: 'website', type: 'url' },
      { name: 'social_links', type: 'json' }
    ]
  },

  audit_logs: {
    name: 'audit_logs',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'action', type: 'text', required: true },
      { name: 'resource', type: 'text', required: true },
      { name: 'details', type: 'json' },
      { name: 'ip_address', type: 'text' },
      { name: 'user_agent', type: 'text' },
      { name: 'timestamp', type: 'date', required: true }
    ]
  },

  api_keys: {
    name: 'api_keys',
    type: 'base',
    schema: [
      { name: 'name', type: 'text', required: true },
      { name: 'service', type: 'text', required: true },
      { name: 'encrypted_key', type: 'text', required: true },
      { name: 'is_active', type: 'bool', options: { default: true } },
      { name: 'created_by', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'last_used', type: 'date' },
      { name: 'usage_count', type: 'number', options: { default: 0 } }
    ]
  },

  friends: {
    name: 'friends',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'friend', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'status', type: 'select', required: true, options: { values: ['pending', 'accepted', 'blocked'] } },
      { name: 'requested_at', type: 'date', required: true },
      { name: 'accepted_at', type: 'date' }
    ]
  },

  messages: {
    name: 'messages',
    type: 'base',
    schema: [
      { name: 'sender', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'recipient', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'content', type: 'text', required: true },
      { name: 'media_links', type: 'json' },
      { name: 'is_read', type: 'bool', options: { default: false } },
      { name: 'thread_id', type: 'text' },
      { name: 'reply_to', type: 'relation', options: { collectionId: 'messages', maxSelect: 1 } }
    ]
  },

  classifieds: {
    name: 'classifieds',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'category', type: 'select', required: true, options: { 
        values: ['musicians_available', 'musicians_wanted', 'bands_available', 'bands_wanted', 'equipment', 'services'] 
      }},
      { name: 'genre', type: 'text' },
      { name: 'experience_level', type: 'select', options: { values: ['beginner', 'intermediate', 'advanced', 'professional'] } },
      { name: 'location', type: 'text' },
      { name: 'age_range', type: 'text' },
      { name: 'influences', type: 'json' },
      { name: 'media_links', type: 'json' },
      { name: 'contact_info', type: 'json' },
      { name: 'is_active', type: 'bool', options: { default: true } },
      { name: 'expires_at', type: 'date' }
    ]
  },

  events: {
    name: 'events',
    type: 'base',
    schema: [
      { name: 'organizer', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'event_type', type: 'select', required: true, options: { 
        values: ['concert', 'jam_session', 'workshop', 'competition', 'networking', 'other'] 
      }},
      { name: 'venue', type: 'text' },
      { name: 'address', type: 'text' },
      { name: 'start_date', type: 'date', required: true },
      { name: 'end_date', type: 'date' },
      { name: 'price', type: 'number' },
      { name: 'max_attendees', type: 'number' },
      { name: 'genres', type: 'json' },
      { name: 'media_links', type: 'json' },
      { name: 'is_public', type: 'bool', options: { default: true } }
    ]
  },

  media: {
    name: 'media',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'type', type: 'select', required: true, options: { 
        values: ['image', 'audio', 'video', 'document', 'external_link'] 
      }},
      { name: 'file', type: 'file', options: { maxSelect: 1, maxSize: 104857600 } }, // 100MB
      { name: 'external_url', type: 'url' },
      { name: 'tags', type: 'json' },
      { name: 'folder', type: 'text' },
      { name: 'is_public', type: 'bool', options: { default: false } },
      { name: 'metadata', type: 'json' },
      { name: 'ai_generated', type: 'bool', options: { default: false } },
      { name: 'ai_model', type: 'text' }
    ]
  },

  credits: {
    name: 'credits',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'project_title', type: 'text', required: true },
      { name: 'role', type: 'text', required: true },
      { name: 'description', type: 'text' },
      { name: 'collaborators', type: 'relation', options: { collectionId: 'users', maxSelect: 10 } },
      { name: 'media_references', type: 'relation', options: { collectionId: 'media', maxSelect: 20 } },
      { name: 'world_id', type: 'relation', options: { collectionId: 'worlds', maxSelect: 1 } },
      { name: 'completion_date', type: 'date' },
      { name: 'is_featured', type: 'bool', options: { default: false } },
      { name: 'tags', type: 'json' }
    ]
  },

  worlds: {
    name: 'worlds',
    type: 'base',
    schema: [
      { name: 'creator', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'theme', type: 'text' },
      { name: 'collaborators', type: 'relation', options: { collectionId: 'users', maxSelect: 50 } },
      { name: 'media_collection', type: 'relation', options: { collectionId: 'media', maxSelect: 100 } },
      { name: 'credits_collection', type: 'relation', options: { collectionId: 'credits', maxSelect: 100 } },
      { name: 'is_public', type: 'bool', options: { default: true } },
      { name: 'featured_image', type: 'file', options: { maxSelect: 1, maxSize: 5242880 } },
      { name: 'tags', type: 'json' }
    ]
  },

  learning_progress: {
    name: 'learning_progress',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'course_id', type: 'text', required: true },
      { name: 'lesson_id', type: 'text' },
      { name: 'progress_percentage', type: 'number', options: { min: 0, max: 100 } },
      { name: 'xp_earned', type: 'number', options: { default: 0 } },
      { name: 'badges', type: 'json' },
      { name: 'completed_at', type: 'date' },
      { name: 'quiz_scores', type: 'json' },
      { name: 'time_spent', type: 'number', options: { default: 0 } }
    ]
  },

  beta_access: {
    name: 'beta_access',
    type: 'base',
    schema: [
      { name: 'user', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'feature_name', type: 'text', required: true },
      { name: 'granted_by', type: 'relation', required: true, options: { collectionId: 'users', maxSelect: 1 } },
      { name: 'granted_at', type: 'date', required: true },
      { name: 'expires_at', type: 'date' },
      { name: 'is_active', type: 'bool', options: { default: true } },
      { name: 'feedback', type: 'text' }
    ]
  }
}

async function initializePocketBase() {
  try {
    console.log('🚀 Initializing PocketBase for The Media Patch...')

    // Try to authenticate as admin (will fail on first run, which is expected)
    try {
      await pb.admins.authWithPassword('admin@mediapatch.com', 'SecureAdminPass123!')
      console.log('✅ Admin authenticated')
    } catch (error) {
      console.log('⚠️  Admin not found or authentication failed (expected on first run)')
    }

    // Create collections
    console.log('📦 Creating collections...')
    
    for (const [collectionName, schema] of Object.entries(COLLECTIONS_SCHEMA)) {
      try {
        await pb.collections.create(schema)
        console.log(`✅ Created collection: ${collectionName}`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Collection ${collectionName} already exists`)
        } else {
          console.error(`❌ Failed to create collection ${collectionName}:`, error.message)
        }
      }
    }

    // Create God Mode users if they don't exist
    console.log('👑 Setting up God Mode users...')
    
    for (const email of GOD_MODE_EMAILS) {
      try {
        // Check if user exists
        let user
        try {
          user = await pb.collection('users').getFirstListItem(`email="${email}"`)
          console.log(`⚠️  God Mode user ${email} already exists`)
        } catch (error) {
          // User doesn't exist, create them
          const hashedPassword = await bcrypt.hash('TempPassword123!', 12)
          const username = email.split('@')[0]
          
          user = await pb.collection('users').create({
            email,
            username,
            password: hashedPassword,
            passwordConfirm: hashedPassword,
            isGodMode: true,
            role: 'god',
            verified: true
          })
          
          console.log(`✅ Created God Mode user: ${email}`)
          console.log(`🔑 Temporary password: TempPassword123! (please change immediately)`)
        }

        // Ensure user has God Mode privileges
        if (!user.isGodMode) {
          await pb.collection('users').update(user.id, {
            isGodMode: true,
            role: 'god'
          })
          console.log(`✅ Updated ${email} to God Mode`)
        }
      } catch (error) {
        console.error(`❌ Failed to setup God Mode user ${email}:`, error.message)
      }
    }

    console.log('🎉 PocketBase initialization completed!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Start PocketBase: pocketbase serve --http=localhost:8090')
    console.log('2. Access admin panel: http://localhost:8090/_/')
    console.log('3. Change God Mode user passwords')
    console.log('4. Start the Next.js application: npm run dev')
    console.log('')
    console.log('🔐 God Mode users:')
    GOD_MODE_EMAILS.forEach(email => {
      console.log(`   - ${email} (password: TempPassword123!)`)
    })

  } catch (error) {
    console.error('❌ PocketBase initialization failed:', error)
    process.exit(1)
  }
}

// Run initialization
initializePocketBase()
