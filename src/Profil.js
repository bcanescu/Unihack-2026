import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
// În Expo, vector-icons sunt deja instalate. Folosim Feather și Ionicons.
import { Feather, Ionicons } from '@expo/vector-icons';
import dateJson from './DatePersonale.json'; 

export default function Profil() {
    const [pacient, setPacient] = useState({
        nume: "Se încarcă...",
        pozaProfil: "https://i.pravatar.cc/150?img=11"
    });

    useEffect(() => {
        setPacient(dateJson.pacient);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Feather name="chevron-left" size={28} color="#0ebcba" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profilul Meu</Text>
            </View>

            {/* Zona Foto Profil și Nume */}
            <View style={styles.profileSection}>
                <View style={styles.imageContainer}>
                    <Image 
                        source={{ uri: pacient.pozaProfil }} 
                        style={styles.profileImage} 
                    />
                    <TouchableOpacity style={styles.editButton}>
                        <Feather name="edit-2" size={14} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.profileName}>{pacient.nume}</Text>
            </View>

            {/* Meniul de navigație complet */}
            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
                
                <MenuItem iconName="user" title="Profil" />
                <MenuItem iconName="heart" title="Favorite" />
                <MenuItem iconName="credit-card" title="Metode De Plata" />
                <MenuItem iconName="lock" title="Politica Privata" />
                <MenuItem iconName="settings" title="Setari" />
                <MenuItem iconName="help-circle" title="Ajutor" />

                {/* Delogare */}
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuItemLeft}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="log-out-outline" size={20} color="#0ebcba" style={{ transform: [{ scaleX: -1 }] }} />
                        </View>
                        <Text style={styles.menuText}>Delogare</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const MenuItem = ({ iconName, title }) => (
    <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemLeft}>
            <View style={styles.iconWrapper}>
                <Feather name={iconName} size={20} color="#0ebcba" />
            </View>
            <Text style={styles.menuText}>{title}</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#BFDBFE" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: '#0ebcba',
    },
    profileSection: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f3f5f7',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0ebcba',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    profileName: {
        marginTop: 16,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    menuContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        marginBottom: 4,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f3f5f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    }
});