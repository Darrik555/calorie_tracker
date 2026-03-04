import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const targetKcal = 2000;
  const eatenKcal = 1450;
  const burnedKcal = 350;
  const remainingKcal = targetKcal - eatenKcal + burnedKcal;

  const macros = {
    carbs: { current: 120, target: 250, color: 'bg-blue-400' },
    protein: { current: 95, target: 150, color: 'bg-red-400' },
    fat: { current: 45, target: 70, color: 'bg-yellow-400' },
  };

  const meals = [
    { id: '1', name: 'Breakfast', kcal: 450 },
    { id: '2', name: 'Lunch', kcal: 650 },
    { id: '3', name: 'Dinner', kcal: 350 },
    { id: '4', name: 'Snacks', kcal: 0 },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 px-4 pt-12">
      {/* Header */}
      <Text className="text-3xl font-bold text-gray-800 mb-6 tracking-tight">
        Today
      </Text>

      {/* Top Box: Calorie Summary & Macros */}
      <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
        
        {/* Tacho / Calorie Counter Row */}
        <View className="flex-row justify-between items-center mb-8">
          
          {/* Left: Eaten */}
          <View className="items-center flex-1">
            <Text className="text-gray-500 font-medium mb-1">Eaten</Text>
            <Text className="text-xl font-bold text-gray-800">{eatenKcal}</Text>
            <Text className="text-xs text-gray-400">kcal</Text>
          </View>

          {/* Center: Tacho (Remaining) */}
          <View className="items-center justify-center w-32 h-32 rounded-full border-8 border-green-100 bg-white shadow-sm z-10">
            <Text className="text-3xl font-extrabold text-green-500">{remainingKcal}</Text>
            <Text className="text-sm font-medium text-gray-500">Remaining</Text>
          </View>

          {/* Right: Burned (Placeholder) */}
          <View className="items-center flex-1">
            <Text className="text-gray-500 font-medium mb-1">Burned</Text>
            <Text className="text-xl font-bold text-orange-400">{burnedKcal}</Text>
            <Text className="text-xs text-gray-400">kcal</Text>
          </View>
        </View>

        {/* Macros Section */}
        <View className="flex-row justify-between pt-4 border-t border-gray-100">
          {Object.entries(macros).map(([key, macro]) => {
            // Calculate percentage for the progress bar, maxed at 100%
            const progress = Math.min((macro.current / macro.target) * 100, 100);

            return (
              <View key={key} className="flex-1 px-2">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs font-bold text-gray-700 capitalize">{key}</Text>
                  <Text className="text-xs text-gray-500">{macro.current}g</Text>
                </View>
                {/* Progress Bar Background */}
                <View className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  {/* Progress Bar Fill */}
                  <View 
                    className={`h-full rounded-full ${macro.color}`} 
                    style={{ width: `${progress}%` }} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom Box: Nutrition / Meals */}
      <Text className="text-xl font-bold text-gray-800 mb-4 px-2">
        Nutrition
      </Text>
      
      <View className="bg-white rounded-3xl p-4 mb-12 shadow-sm border border-gray-100">
        {meals.map((meal, index) => (
          <View 
            key={meal.id} 
            className={`flex-row items-center justify-between py-4 ${
              index !== meals.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-800">{meal.name}</Text>
              <Text className="text-sm text-gray-500 mt-1">{meal.kcal} kcal</Text>
            </View>

            {/* Add Button */}
            <TouchableOpacity className="bg-green-100 w-10 h-10 rounded-full items-center justify-center">
              <Ionicons name="add" size={24} color="#22c55e" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}