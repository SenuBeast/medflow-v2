import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://loqrfteqgjwmmekamrok.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvcXJmdGVxZ2p3bW1la2Ftcm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTkzMDAsImV4cCI6MjA4NzI3NTMwMH0.ZnAuQggJLucK0vDyX8y8Znt_neN87c7LWNNJssZlM3M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAvatars() {
    const { data, error } = await supabase.from('users').select('full_name, avatar_url').limit(10);
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log('User Avatars:');
    data.forEach(u => {
        console.log(`- ${u.full_name}: ${u.avatar_url}`);
    });
}

checkAvatars();
