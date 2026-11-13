import React from 'react';
import {StyleSheet, Text, View, Image, TouchableOpacity, ScrollView} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';

LocaleConfig.locales['ro'] = {
    monthNames:['Noiembrie', 'Decembrie', 'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie'],
    monthNamesShort:['Nov.', 'Dec.', 'Ian.', 'Feb.', 'Mar.', 'Apr.', 'Mai', 'Iun.', 'Iul.', 'Aug.', 'Sept.', 'Oct.'],
    dayNames:['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'],
    dayNamesShort:['Du', 'Lu', 'Ma', 'Mi', 'Joi', 'Vi', 'Sâ'],
    today:'Azi'
};
LocaleConfig.defaultLocale='ro';

export default function DoctorProfileScreen()
{
    const timeSlots = ['10:00', '10:30', '11:00', '11:30'];
    
    return(
        <ScrollView contentContainerStyle="{styles.scrollContent}" style="{styles.container">
            <View style="{styles.headerRow}">
                <View style="{styles.imagePlacegholder}">
                    <Image soruce="{require('../../../assets/favicon.png')}" style="{styles.doctorImage}"/>
                </View>
                <View style="{styles.headerInfo}">
                    <Text style="{styles.doctorName}">Dr Banca Sebastian</Text>
                    <Text style="{styles.doctorSpeciality}">Cardiolog</Text>
                </View>
            </View>

            <Text style="{styles.sectionTitle}">Despre</Text>
            <Text style="{styles.descriptionText}">Doctor cu o experiență vastă în domeniu, specializat în diagnosticarea și tratamentul afecțiunilor cardiovasculare complexe...
            <Text style="{styles.readMore}">Read more</Text>
            </Text>

            <View style="{styles.timeSlotsContainer}">
                {timeSlots.map((time, index) => (
                    <TouchableOpacity activeOpacity="{0.8}" key="{index}" style="{styles.timeBadge}">
                        <Text style="{styles.timeText}">{time}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style="{styles.calendarWrapper}">
                <Calendar 
                    firstDay={1}
                    theme={{
                        backgroundColor: '#a3a3a3',
                        calendarBackground: '#a3a3a3',
                        textSectionTitleColor: '#000',
                        todayTextColor: '#fff', // Ziua de azi va avea text alb ca să iasă în evidență
                        todayBackgroundColor: '#000', // Și fundal negru pentru ziua de azi
                        dayTextColor: '#000',
                        textDisabledColor: '#666',
                        arrowColor: '#000',
                        monthTextColor: '#000',
                        textDayFontWeight: 'bold',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: 'bold'
                    }}/>
            </View>

            <TouchableOpacity activeOpacity="{0.8}" style="{styles.bookButton">
                <Text style="{styles.bookButtonText}">Fa programarea</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
const styles=StyleSheet.create({
    container:{
        flex:1,
        backgroundColor:'#ffffff',
    },
    scrollContent:{
        paddingHorizontal:25,
        paddingTop:60,
        paddingBottom:40,
    },
    headerRow:{
        flexDirection:'row',
        alignItems:'center',
        marginBottom:30,
    },
    imagePlaceholder:{
        width:90,
        height:90,
        backgroundColor:'#e0e0e0',
        borderRadius:15,
        marginRight:20,
    },
    doctorImage:{
        width:90,
        height:90,
        borderRadius:15,
    },
    doctorName:{
        fontSize:22,
        fontWeight:'bold',
        color:'#000',
    },
    doctorSpecialty:{
        fontSize:14,
        color:'#666',
        marginTop:4,
    },
    sectionTitle:{
        fontSize:20,
        fontWeight:"bold",
        color:'#000',
        marginBottom:10,
    },
    descriptionText:{
        fontSize:14,
        color:'#737373',
        lineHeight:20,
        marginBottom:25,
    },
    readMore:{
        color:'#00cbb2',
        fontWeight:'bold',
    },
    timeSlotsContainer:{
        flexDirection:'row',
        justifyContent:'space-between',
        marginBottom:30,
    },
    timeBadge:{
        backgroundColor:'#00cbb2',
        paddingVertical:10,
        paddingHorizontal:12,
        borderRadius:8,
    },
    timeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  calendarWrapper: {
    borderRadius: 20,
    overflow: 'hidden', 
    marginBottom: 30,
    padding: 10,
    backgroundColor: '#a3a3a3',
  },
  bookButton: {
    backgroundColor: '#00cbb2',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});