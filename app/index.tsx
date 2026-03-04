import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
// Adjust the import path if your file structure differs slightly
import { supabase } from '../src/services/supabase'; 

export default function AuthScreen() {
  // Local state management for form inputs and loading indicator
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Authenticate existing user
  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      Alert.alert('Success', 'You are successfully logged in!');
    }
    setLoading(false);
  }

  // Register a new user
  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please check your email.');
    }
    setLoading(false);
  }

  return (
    // Main container with NativeWind classes for centering and background
    <View className="flex-1 justify-center px-6 bg-white">
      <View className="items-center mb-10">
        <Text className="text-4xl font-bold text-gray-800 tracking-tight">
          CalorieTracker
        </Text>
        <Text className="text-gray-500 mt-2 text-base">
          Log in to manage your nutrition
        </Text>
      </View>

      {/* Email Input */}
      <View className="mb-4">
        <Text className="text-gray-700 font-medium mb-2">Email</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-4 text-gray-800 bg-gray-50"
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {/* Password Input */}
      <View className="mb-8">
        <Text className="text-gray-700 font-medium mb-2">Password</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-4 text-gray-800 bg-gray-50"
          onChangeText={setPassword}
          value={password}
          secureTextEntry={true}
          placeholder="********"
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
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="border border-green-400 rounded-lg py-4 items-center bg-transparent"
            onPress={signUpWithEmail}
            disabled={loading}
          >
            <Text className="text-green-500 font-bold text-lg">Create Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}