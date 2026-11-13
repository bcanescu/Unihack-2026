import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FormularAdministrator() {
  const [nume, setNume] = useState('');
  const [cnp, setCnp] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');

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
        {/* Câmpul 1: Nume+Prenume */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nume+Prenume</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9ba1b0"
              value={nume}
              onChangeText={setNume}
            />
          </View>
        </View>

        {/* Câmpul 2: CNP */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>CNP</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="card-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your CNP"
              placeholderTextColor="#9ba1b0"
              value={cnp}
              onChangeText={setCnp}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Câmpul 3: Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9ba1b0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Câmpul 4: Telefon */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Număr de telefon</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#7b8292" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your phone"
              placeholderTextColor="#9ba1b0"
              value={telefon}
              onChangeText={setTelefon}
              keyboardType="phone-pad"
            />
          </View>
        </View>
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
    alignItems: 'center', // Centrează tot conținutul pe mijloc pe orizontală
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400, // Limitează lățimea pe ecrane mari (web/tablets) ca să arate perfect centrat
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#000000',
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25, // Margini rotunjite exact ca în poză
    paddingHorizontal: 15,
    height: 55,
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