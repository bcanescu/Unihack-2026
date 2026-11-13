import React from 'react';
import {StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';

export default function WelcomeScreen()
{
    return (
        <View style={styles.container}>
            <Image source={require('../../../assets/MedlyImage.png')}style={styles.logo} resizeMode="contain" />


            <Text style={styles.title}>Let's get started!</Text>

            <Text style={styles.subtitle}>
                Login to enjoy the features we've{'/n'}provided, and stay healthy!
            </Text>

            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
                <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8}>
                <Text style={styles.signUpTExt}>Sign Up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#ffffff',
        alignItems:'center',
        justifyContent:'center',
        paddingHorizontal:30,
    },
    logo:{
        width:120,
        height:120,
        marginBottom:20,
    },
    title:{
        fontSize:22,
        fontWeight:'bold',
        color:'#1a1a1a',
        marginBottom:10,
    },
    subtitle:{
        fontSize:14,
        color:'#8e8e93',
        textAlign:'center',
        marginBottom:40,
        lineHeight:20,
    },
    loginButton:{
        backgroundColor:'#00cbb2',
        width:'100%',
        paddingVertical:16,
        borderRadius:30,
        alignItems:'center',
        marginBottom:15,
    },
    loginText:{
        color:'#ffffff',
        fontSize:16,
        fontWeight:'bold',
    },
    signUpButton:{
        backgroundColor:'#ffffff',
        width:'100%',
        paddingVertical:16,
        borderRadius:30,
        alignItems:'center',
        broderWidth:1.5,
        borderColor:'00ebd0',
    },
    signUpText:{
        color:'#00cbb2',
        fontSize:16,
        fontWeight:'bold',
    },
});
