import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminFormScreen() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [name3, setName3] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      {/* Bara de sus */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formular Administrator</Text>
      </View>

      {/* Corpul formularului */}
      <View style={styles.formContainer}>
        {/* Primul input (cel evidențiat/selectat din poză) */}
        <View style={[styles.inputWrapper, styles.inputActive]}>
          <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#9ba1b0"
            value={name1}
            onChangeText={setName1}
          />
        </View>

        {/* Al doilea input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#9ba1b0"
            value={name2}
            onChangeText={setName2}
          />
        </View>

        {/* Al treilea input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#9ba1b0"
            value={name3}
            onChangeText={setName3}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 90,
    backgroundColor: '#00cbb2',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  formContainer: {
    paddingHorizontal: 20,
    marginTop: 35,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e6eb',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputActive: {
    borderColor: '#5c6480', // Chenarul mai închis la culoare exact ca în selecția din poză
    borderWidth: 1.5,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
});