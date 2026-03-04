import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { supabase } from '../../src/services/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace('/');
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-8">
        Your Profile
      </Text>
      
      {/* Logout Button */}
      <TouchableOpacity 
        className="bg-red-500 px-6 py-3 rounded-lg"
        onPress={handleSignOut}
      >
        <Text className="text-white font-bold">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}