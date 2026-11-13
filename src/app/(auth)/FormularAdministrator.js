import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';

export default function FormularAdministrator() {
  const [nume, setNume] = useState('');
  const [prenume, setPrenume] = useState('');
  const [cnp, setCnp] = useState('');
  const [specializare, setSpecializare] = useState('');
  const [spital, setSpital] = useState('');
  const [parafa, setParafa] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      {/* Bara de sus */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formular Administrator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Text explicativ */}
        <Text style={styles.description}>
          Acest formular se completeaza de catre medic pentru a obtine accesul pe platforma Medly.
        </Text>

        {/* 1. Nume */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nume</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Introduceti Numele de Familie"
              placeholderTextColor="#9ba1b0"
              value={nume}
              onChangeText={setNume}
            />
          </View>
        </View>

        {/* 2. Prenume */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Prenume</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Introduceti Prenumele"
              placeholderTextColor="#9ba1b0"
              value={prenume}
              onChangeText={setPrenume}
            />
          </View>
        </View>

        {/* 3. CNP */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>CNP</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Intreoduceti CNP-ul"
              placeholderTextColor="#9ba1b0"
              value={cnp}
              onChangeText={setCnp}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* 4. Specializare */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Specializare</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="card-text-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Alegeti specializarea"
              placeholderTextColor="#9ba1b0"
              value={specializare}
              onChangeText={setSpecializare}
            />
            <Ionicons name="chevron-down" size={20} color="#7b8292" />
          </View>
        </View>

        {/* 5. Spitalul de Provenienta */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Spitalul de Provenienta</Text>
          <View style={styles.inputWrapper}>
            <FontAwesome5 name="hospital" size={18} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Introduceti spitalul"
              placeholderTextColor="#9ba1b0"
              value={spital}
              onChangeText={setSpital}
            />
          </View>
        </View>

        {/* 6. Cod Unic de Parafa */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cod Unic de Parafa</Text>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="pen" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Inarcati PDF-ul"
              placeholderTextColor="#9ba1b0"
              value={parafa}
              onChangeText={setParafa}
            />
            <Feather name="download" size={20} color="#7b8292" />
          </View>
        </View>

        {/* Buton Trimite */}
        <TouchableOpacity activeOpacity={0.8} style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Trimite</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 13,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#000000',
    marginBottom: 6,
    marginLeft: 6,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 52,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
  },
  submitButton: {
    backgroundColor: '#00cbb2',
    width: '100%',
    maxWidth: 300,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});