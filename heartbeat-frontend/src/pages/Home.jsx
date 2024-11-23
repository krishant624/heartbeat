import { Box, Container, Heading, Text, Button, Stack } from '@chakra-ui/react';

const Home = () => {
  return (
    <Container maxW="container.xl" py={20}>
      <Stack spacing={8} alignItems="center" textAlign="center">
        <Heading 
          fontSize={{ base: '4xl', sm: '5xl' }}
          fontWeight="bold"
          color="pink.500"
        >
          Find Your Perfect Match
        </Heading>
        <Text fontSize={{ base: 'lg', sm: 'xl' }} color="gray.600">
          Join thousands of people looking for meaningful connections
        </Text>
        <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
          <Button
            colorScheme="pink"
            size="lg"
            rounded="full"
            px={8}
          >
            Get Started
          </Button>
          <Button
            variant="outline"
            colorScheme="pink"
            size="lg"
            rounded="full"
            px={8}
          >
            Learn More
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export default Home;