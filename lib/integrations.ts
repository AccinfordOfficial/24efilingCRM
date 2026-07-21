// Integration helpers for Razorpay, Exotel, and MSG91

export const RazorpayIntegration = {
    generatePaymentLink: async (leadId: string, amount: number, customerName: string, phone: string) => {
        const link = `https://rzp.io/i/24efiling-${Math.random().toString(36).substring(7)}`;
        return {
            payment_link: link,
            id: `plink_${Math.random().toString(36).substring(7)}`,
            amount: amount,
            status: 'created'
        };
    }
};

export const ExotelCloudTelephony = {
    initiateClickToCall: async (agentPhone: string, customerPhone: string) => {
        return {
            call_id: `call_${Math.random().toString(36).substring(7)}`,
            status: 'dialing',
            agent_phone: agentPhone,
            customer_phone: customerPhone
        };
    }
};

export const MSG91SmsGateway = {
    sendOtp: async (phone: string, otp: string) => {
        return {
            status: 'success',
            message_id: `msg_${Math.random().toString(36).substring(7)}`
        };
    },
    sendSmsNotification: async (phone: string, templateId: string, variables: Record<string, string>) => {
        return {
            status: 'success',
            template_id: templateId
        };
    }
};
