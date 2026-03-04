import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/services/supabase'; 

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function signInWithEmail() {
    setLoading(true);
    setErrorMessage('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }

  async function signUpWithEmail() {
    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-white dark:bg-gray-900">
      <View className="items-center mb-10">
        <Text className="text-4xl font-bold text-gray-800 dark:text-white tracking-tight">
          CalorieTracker
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mt-2 text-base">
          Log in to manage your nutrition
        </Text>
      </View>

      {/* Display error message if it exists */}
      {errorMessage ? (
        <View className="bg-red-100 border border-red-400 rounded-lg p-3 mb-4">
          <Text className="text-red-700 text-sm">{errorMessage}</Text>
        </View>
      ) : null}

      {/* ... rest of your inputs (Email & Password) ... */}
      <View className="mb-4">
        <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">Email</Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800"
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View className="mb-8">
        <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">Password</Text>
        <TextInput
          className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 text-gray-800 dark:text-white bg-gray-50 dark:bg-gray-800"
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          placeholder="********"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
      </View>

      {/* Action Buttons */}
      {loading ? (
        <ActivityIndicator size="large" color="#4ade80" />
      ) : (
        <View className="gap-y-4">
          <TouchableOpacity 
            className="bg-green-400 rounded-lg py-4 items-center"
            onPress={signInWithEmail}
          >
            <Text className="text-white font-bold text-lg">Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="border border-green-400 rounded-lg py-4 items-center bg-transparent"
            onPress={signUpWithEmail}
          >
            <Text className="text-green-500 font-bold text-lg">Create Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}